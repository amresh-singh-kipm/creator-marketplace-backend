const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const pool = require("../db");

// POST /api/payments/create-order
const createOrder = async (req, res) => {
  const { booking_id } = req.body;
  try {
    const [booking] = await pool.query("SELECT * FROM bookings WHERE id = ?", [
      booking_id,
    ]);
    if (!booking.length)
      return res.status(404).json({ message: "Booking not found" });
    const b = booking[0];
    if (b.status !== "accepted")
      return res
        .status(400)
        .json({ message: "Booking must be accepted before payment" });

    // Block if already paid
    const [existing] = await pool.query(
      "SELECT * FROM payments WHERE booking_id = ? AND payment_status = 'completed'",
      [booking_id],
    );
    if (existing.length)
      return res
        .status(400)
        .json({ message: "Payment already completed for this booking" });

    const amountInPaise = Math.round(parseFloat(b.price) * 100);
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${booking_id}_${Date.now()}`,
      notes: { booking_id: String(booking_id) },
    });

    // Upsert: update existing pending row, or insert if none exists
    const [pendingPayment] = await pool.query(
      "SELECT id FROM payments WHERE booking_id = ? AND payment_status != 'completed'",
      [booking_id],
    );

    if (pendingPayment.length) {
      // Reuse existing row — just update the order_id for the new Razorpay order
      await pool.query(
        "UPDATE payments SET razorpay_order_id = ?, razorpay_payment_id = NULL, payment_status = 'pending' WHERE id = ?",
        [order.id, pendingPayment[0].id],
      );
    } else {
      await pool.query(
        "INSERT INTO payments (booking_id, razorpay_order_id, amount, uuid) VALUES (?,?,?,UUID())",
        [booking_id, order.id, b.price],
      );
    }

    return res.json({
      order_id: order.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/payments/verify
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    booking_id,
  } = req.body;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res
        .status(400)
        .json({ message: "Payment verification failed: signature mismatch" });

    await pool.query(
      "UPDATE payments SET razorpay_payment_id=?, payment_status='completed' WHERE razorpay_order_id=?",
      [razorpay_payment_id, razorpay_order_id],
    );

    // Put in escrow (INSERT if not exists, UPDATE if exists)
    const [booking] = await pool.query(
      "SELECT price FROM bookings WHERE id = ?",
      [booking_id],
    );
    await pool.query(
      `INSERT INTO escrow_wallet (booking_id, amount, status) VALUES (?,?,'held')
       ON DUPLICATE KEY UPDATE status='held'`,
      [booking_id, booking[0].price],
    );

    // Notify creator
    const [b] = await pool.query(
      `SELECT b.id, b.creator_id, bp.user_id AS brand_user_id, cp.user_id AS creator_user_id
       FROM bookings b
       JOIN brand_profiles bp ON b.brand_id = bp.id
       JOIN creator_profiles cp ON b.creator_id = cp.id
       WHERE b.id = ?`,
      [booking_id],
    );
    if (b.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          b[0].creator_user_id,
          `Payment received for booking #${booking_id}. Please submit your content.`,
        ],
      );
    }

    return res.json({
      success: true,
      message: "Payment verified, funds in escrow",
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/payments/booking/:booking_id
const getPaymentByBooking = async (req, res) => {
  const { booking_id } = req.params;
  try {
    const [payment] = await pool.query(
      "SELECT * FROM payments WHERE booking_id = ?",
      [booking_id],
    );
    const [escrow] = await pool.query(
      "SELECT * FROM escrow_wallet WHERE booking_id = ?",
      [booking_id],
    );
    return res.json({ payment: payment[0] || null, escrow: escrow[0] || null });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/payments/all (admin)
const getAllPayments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, b.price AS booking_price, bp.company_name, cp.username AS creator_username
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN brand_profiles bp ON b.brand_id = bp.id
      JOIN creator_profiles cp ON b.creator_id = cp.id
      ORDER BY p.created_at DESC LIMIT 100
    `);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentByBooking,
  getAllPayments,
};
