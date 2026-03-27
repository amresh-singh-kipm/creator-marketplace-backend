const pool = require("../db");
const { randomUUID } = require("crypto");
const { createNotification } = require("./notificationController");

// GET /api/messages?booking_id=X
const getMessages = async (req, res) => {
  const { booking_id } = req.query;
  try {
    let query, params;
    if (booking_id) {
      query = `
        SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.booking_id = ? ORDER BY m.created_at ASC
      `;
      params = [booking_id];
    } else {
      query = `
        SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar,
               u2.name AS receiver_name, u2.avatar_url AS receiver_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE m.sender_id = ? OR m.receiver_id = ?
        ORDER BY m.created_at DESC LIMIT 100
      `;
      params = [req.user.id, req.user.id];
    }
    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/messages
const sendMessage = async (req, res) => {
  // Creators are not allowed to send messages; only brands initiate conversations
  if (req.user.role === "creator") {
    return res
      .status(403)
      .json({
        message:
          "Creators cannot send messages. Brands initiate conversations.",
      });
  }
  const { receiver_id, booking_id, message } = req.body;
  if (!receiver_id || !message)
    return res
      .status(400)
      .json({ message: "receiver_id and message required" });
  try {
    const msgId = randomUUID();
    await pool.query(
      "INSERT INTO messages (id, sender_id, receiver_id, booking_id, message) VALUES (?,?,?,?,?)",
      [msgId, req.user.id, receiver_id, booking_id || null, message],
    );
    await createNotification(
      receiver_id,
      "New Message",
      `New message from ${req.user.name || req.user.email}`,
      '/brand/messages'
    );
    const [rows] = await pool.query("SELECT * FROM messages WHERE id = ?", [
      msgId,
    ]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getMessages, sendMessage };
