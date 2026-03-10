const pool = require("../db");

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, avatar_url, created_at FROM users ORDER BY created_at DESC",
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    await pool.query("UPDATE users SET role=? WHERE id=?", [role, id]);
    await pool.query("INSERT INTO admin_logs (action, admin_id) VALUES (?,?)", [
      `Changed role of user ${id} to ${role}`,
      req.user.id,
    ]);
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [id],
    );
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    await pool.query("INSERT INTO admin_logs (action, admin_id) VALUES (?,?)", [
      `Deleted user ${id}`,
      req.user.id,
    ]);
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/creators/pending
const getPendingCreators = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cp.*, u.name, u.email, u.avatar_url
      FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.verified = 0
      ORDER BY cp.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/creators/:id/verify
const verifyCreator = async (req, res) => {
  const { id } = req.params;
  const { verified } = req.body;
  const verifiedVal = verified ? 1 : 0;
  try {
    await pool.query("UPDATE creator_profiles SET verified=? WHERE id=?", [
      verifiedVal,
      id,
    ]);
    await pool.query("INSERT INTO admin_logs (action, admin_id) VALUES (?,?)", [
      `${verified ? "Verified" : "Unverified"} creator profile ${id}`,
      req.user.id,
    ]);
    const [rows] = await pool.query(
      "SELECT * FROM creator_profiles WHERE id = ?",
      [id],
    );
    const cp = rows[0];
    if (cp) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          cp.user_id,
          verified
            ? "Your profile has been verified! ✅"
            : "Your profile verification was revoked.",
        ],
      );
    }
    return res.json(cp);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/transactions
const getTransactions = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, b.price AS booking_price, b.status AS booking_status,
             bp.company_name, cp.username AS creator_username,
             ew.status AS escrow_status
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN brand_profiles bp ON b.brand_id = bp.id
      JOIN creator_profiles cp ON b.creator_id = cp.id
      LEFT JOIN escrow_wallet ew ON ew.booking_id = b.id
      ORDER BY p.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [[users], [creators], [brands], [bookings], [revenue]] =
      await Promise.all([
        pool.query("SELECT COUNT(*) AS count FROM users"),
        pool.query("SELECT COUNT(*) AS count FROM creator_profiles"),
        pool.query("SELECT COUNT(*) AS count FROM brand_profiles"),
        pool.query("SELECT COUNT(*) AS count FROM bookings"),
        pool.query(
          "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_status='completed'",
        ),
      ]);
    return res.json({
      total_users: parseInt(users[0].count),
      total_creators: parseInt(creators[0].count),
      total_brands: parseInt(brands[0].count),
      total_bookings: parseInt(bookings[0].count),
      total_revenue: parseFloat(revenue[0].total),
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/payments/:booking_id/release
const releasePayment = async (req, res) => {
  const { booking_id } = req.params;
  try {
    // Check escrow exists and is in 'held' state
    const [escrow] = await pool.query(
      "SELECT * FROM escrow_wallet WHERE booking_id = ? AND status = 'held'",
      [booking_id],
    );
    if (!escrow.length) {
      return res
        .status(400)
        .json({ message: "No held escrow found for this booking" });
    }

    // Release escrow
    await pool.query(
      "UPDATE escrow_wallet SET status='released' WHERE booking_id = ?",
      [booking_id],
    );

    // Mark booking as completed
    await pool.query("UPDATE bookings SET status='completed' WHERE id = ?", [
      booking_id,
    ]);

    // Notify creator
    const [b] = await pool.query(
      `SELECT cp.user_id AS creator_user_id, ew.amount
       FROM bookings bk
       JOIN creator_profiles cp ON bk.creator_id = cp.id
       JOIN escrow_wallet ew ON ew.booking_id = bk.id
       WHERE bk.id = ?`,
      [booking_id],
    );
    if (b.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          b[0].creator_user_id,
          `Payment of ₹${parseFloat(b[0].amount).toLocaleString()} released for booking #${booking_id}. 🎉`,
        ],
      );
    }

    // Log admin action
    await pool.query("INSERT INTO admin_logs (action, admin_id) VALUES (?,?)", [
      `Released escrow payment for booking #${booking_id}`,
      req.user.id,
    ]);

    return res.json({ success: true, message: "Payment released to creator" });
  } catch (err) {
    console.error("releasePayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/users/:id/history
const getUserHistory = async (req, res) => {
  const { id } = req.params;
  try {
    // Get user info
    const [userRows] = await pool.query(
      "SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?",
      [id],
    );
    if (!userRows.length)
      return res.status(404).json({ message: "User not found" });
    const user = userRows[0];

    let bookings = [],
      collaborations = [];

    if (user.role === "brand") {
      // Brand: bookings they placed
      [bookings] = await pool.query(
        `SELECT b.*, pp.package_name, cp.username AS creator_username,
                p.payment_status, p.amount AS paid_amount
         FROM bookings b
         JOIN brand_profiles bp ON b.brand_id = bp.id
         LEFT JOIN promotion_packages pp ON b.package_id = pp.id
         LEFT JOIN creator_profiles cp ON b.creator_id = cp.id
         LEFT JOIN payments p ON p.booking_id = b.id
         WHERE bp.user_id = ?
         ORDER BY b.created_at DESC`,
        [id],
      );
      // Brand campaigns
      [collaborations] = await pool.query(
        `SELECT c.*, COUNT(ci.id) AS invite_count
         FROM campaigns c
         JOIN brand_profiles bp ON c.brand_id = bp.id
         LEFT JOIN campaign_invites ci ON ci.campaign_id = c.id
         WHERE bp.user_id = ?
         GROUP BY c.id ORDER BY c.created_at DESC`,
        [id],
      );
    } else if (user.role === "creator") {
      // Creator: bookings they received
      [bookings] = await pool.query(
        `SELECT b.*, pp.package_name, bp.company_name AS brand_name,
                p.payment_status, p.amount AS paid_amount
         FROM bookings b
         JOIN creator_profiles cp ON b.creator_id = cp.id
         LEFT JOIN promotion_packages pp ON b.package_id = pp.id
         LEFT JOIN brand_profiles bp ON b.brand_id = bp.id
         LEFT JOIN payments p ON p.booking_id = b.id
         WHERE cp.user_id = ?
         ORDER BY b.created_at DESC`,
        [id],
      );
      // Creator collaborations: both owned and participated in
      [collaborations] = await pool.query(
        `SELECT DISTINCT col.id, col.title, col.platform, col.category, col.status,
                col.collaboration_type, col.created_at,
                u_owner.name AS owner_name,
                CASE WHEN col.creator_id = cp_self.id THEN 'owner' ELSE 'participant' END AS role_in_collab
         FROM collaborations col
         JOIN creator_profiles cp_self ON cp_self.user_id = ?
         JOIN creator_profiles cp_owner ON col.creator_id = cp_owner.id
         JOIN users u_owner ON cp_owner.user_id = u_owner.id
         LEFT JOIN collaboration_participants cp_part ON cp_part.collaboration_id = col.id
         WHERE col.creator_id = cp_self.id
            OR cp_part.creator_id = cp_self.id
         ORDER BY col.created_at DESC`,
        [id],
      );
    }

    return res.json({ user, bookings, collaborations });
  } catch (err) {
    console.error("getUserHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/platform-profit
const getPlatformProfit = async (req, res) => {
  const PLATFORM_FEE_PERCENT = 10;
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.booking_id, p.amount, p.payment_status, p.created_at,
             bp.company_name AS brand_name,
             cp.username AS creator_username,
             ROUND(p.amount * ${PLATFORM_FEE_PERCENT} / 100, 2) AS platform_fee,
             ROUND(p.amount * (100 - ${PLATFORM_FEE_PERCENT}) / 100, 2) AS creator_payout,
             ew.status AS escrow_status
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN brand_profiles bp ON b.brand_id = bp.id
      JOIN creator_profiles cp ON b.creator_id = cp.id
      LEFT JOIN escrow_wallet ew ON ew.booking_id = b.id
      WHERE p.payment_status = 'completed'
      ORDER BY p.created_at DESC
    `);

    const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalProfit = rows.reduce(
      (s, r) => s + parseFloat(r.platform_fee),
      0,
    );
    const totalPayout = rows.reduce(
      (s, r) => s + parseFloat(r.creator_payout),
      0,
    );

    return res.json({
      platform_fee_percent: PLATFORM_FEE_PERCENT,
      total_revenue: totalRevenue,
      total_platform_profit: totalProfit,
      total_creator_payout: totalPayout,
      transactions: rows,
    });
  } catch (err) {
    console.error("getPlatformProfit error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  deleteUser,
  getPendingCreators,
  verifyCreator,
  getTransactions,
  getStats,
  // getAdminLogs,
  releasePayment,
  getUserHistory,
  getPlatformProfit,
};
