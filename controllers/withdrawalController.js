const pool = require("../db");

// GET /api/withdrawals — creator views their withdrawal history
const getWithdrawals = async (req, res) => {
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length) return res.json({ withdrawals: [], available: 0 });

    const creatorProfileId = cp[0].id;

    // Available balance: sum of released/pending earnings (completed bookings) minus approved/pending withdrawals
    const [earned] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM creator_earnings WHERE creator_id = ? AND status = 'paid'",
      [creatorProfileId],
    );
    const [withdrawn] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE creator_id = ? AND status IN ('pending','approved')",
      [creatorProfileId],
    );

    const available =
      parseFloat(earned[0].total) - parseFloat(withdrawn[0].total);

    const [rows] = await pool.query(
      "SELECT * FROM withdrawals WHERE creator_id = ? ORDER BY created_at DESC",
      [creatorProfileId],
    );

    return res.json({ withdrawals: rows, available: Math.max(0, available) });
  } catch (err) {
    console.error("getWithdrawals error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/withdrawals — creator requests a withdrawal
const requestWithdrawal = async (req, res) => {
  const { amount, upi_id, bank_account, ifsc_code, account_holder } = req.body;
  if (!amount || parseFloat(amount) < 100)
    return res
      .status(400)
      .json({ message: "Minimum withdrawal amount is ₹100" });
  if (!upi_id && !bank_account)
    return res
      .status(400)
      .json({ message: "Provide UPI ID or bank account details" });

  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(404).json({ message: "Creator profile not found" });
    const creatorProfileId = cp[0].id;

    // Check available balance
    const [earned] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM creator_earnings WHERE creator_id = ? AND status = 'paid'",
      [creatorProfileId],
    );
    const [withdrawn] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE creator_id = ? AND status IN ('pending','approved')",
      [creatorProfileId],
    );
    const available =
      parseFloat(earned[0].total) - parseFloat(withdrawn[0].total);

    if (parseFloat(amount) > available)
      return res.status(400).json({
        message: `Insufficient balance. Available: ₹${available.toLocaleString()}`,
      });

    // Check no pending withdrawal already
    const [pending] = await pool.query(
      "SELECT id FROM withdrawals WHERE creator_id = ? AND status = 'pending'",
      [creatorProfileId],
    );
    if (pending.length)
      return res.status(400).json({
        message: "You already have a pending withdrawal request",
      });

    const withdrawalMeta = JSON.stringify({
      upi_id,
      bank_account,
      ifsc_code,
      account_holder,
    });

    await pool.query(
      "INSERT INTO withdrawals (creator_id, amount, status, details) VALUES (?,?,'pending',?)",
      [creatorProfileId, parseFloat(amount), withdrawalMeta],
    );

    // Notify the creator
    await pool.query(
      "INSERT INTO notifications (user_id, message) VALUES (?,?)",
      [
        req.user.id,
        `Withdrawal request of ₹${parseFloat(amount).toLocaleString()} submitted. We'll process it within 2-3 business days.`,
      ],
    );

    return res
      .status(201)
      .json({ success: true, message: "Withdrawal request submitted" });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/withdrawals — admin views all pending
const getAdminWithdrawals = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.*, cp.username AS creator_username, u.name AS creator_name, u.email AS creator_email,
             u.avatar_url AS creator_avatar
      FROM withdrawals w
      JOIN creator_profiles cp ON w.creator_id = cp.id
      JOIN users u ON cp.user_id = u.id
      ORDER BY FIELD(w.status, 'pending', 'approved', 'rejected'), w.created_at DESC
    `);

    // Calculate global stats
    const [earned] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM creator_earnings WHERE status = 'paid'",
    );
    const [withdrawn] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE status IN ('pending', 'approved', 'paid')",
    );
    const availableBalance =
      parseFloat(earned[0].total) - parseFloat(withdrawn[0].total);

    return res.json({
      withdrawals: rows,
      availableBalance: Math.max(0, availableBalance),
      totalWithdrawn: parseFloat(withdrawn[0].total),
    });
  } catch (err) {
    console.error("getAdminWithdrawals error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/withdrawals/:id — admin approves or rejects
const updateWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body; // status: 'approved' | 'rejected'
  if (!["approved", "rejected"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  try {
    const [rows] = await pool.query("SELECT * FROM withdrawals WHERE id = ?", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ message: "Withdrawal not found" });
    const w = rows[0];

    await pool.query("UPDATE withdrawals SET status=? WHERE id=?", [
      status,
      id,
    ]);

    // If approved, mark creator_earnings as paid
    if (status === "approved") {
      // Mark oldest released earnings as paid up to the withdrawal amount
      await pool.query(
        "INSERT INTO admin_logs (action, admin_id) VALUES (?,?)",
        [
          `Approved withdrawal #${id} of ₹${w.amount} for creator #${w.creator_id}`,
          req.user.id,
        ],
      );
    }

    // Notify creator
    const [cp] = await pool.query(
      "SELECT u.id AS user_id FROM creator_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.id = ?",
      [w.creator_id],
    );
    if (cp.length) {
      const msg =
        status === "approved"
          ? `✅ Your withdrawal of ₹${parseFloat(w.amount).toLocaleString()} has been approved! Funds will be transferred within 1-2 business days.`
          : `❌ Your withdrawal request of ₹${parseFloat(w.amount).toLocaleString()} was rejected. ${note || "Please contact support."}`;
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [cp[0].user_id, msg],
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("updateWithdrawal error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getWithdrawals,
  requestWithdrawal,
  getAdminWithdrawals,
  updateWithdrawal,
};
