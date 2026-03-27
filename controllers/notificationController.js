const pool = require("../db");
const { randomUUID } = require("crypto");
const { emitToUser } = require("../config/socket");

// Helper function to be called from other controllers
const createNotification = async (userId, title, message, link) => {
  try {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, link)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, title, message, link]
    );

    // Fetch the inserted notification to push to socket
    const [rows] = await pool.query("SELECT * FROM notifications WHERE id = ?", [id]);
    
    // Emit real-time event to the specific user via Socket.io
    if (rows.length > 0) {
      emitToUser(userId, "new_notification", rows[0]);
    }
    return rows[0];
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
};

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("getNotifications error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    return res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
      [req.user.id]
    );
    return res.json({ message: "All marked as read" });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
