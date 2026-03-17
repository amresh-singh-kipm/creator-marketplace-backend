const pool = require("../db");
const { randomUUID } = require("crypto");

// POST /api/bookings
const createBooking = async (req, res) => {
  const { creator_id, package_id, campaign_id, notes } = req.body;
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!bp.length)
      return res.status(404).json({ message: "Brand profile not found" });

    const [pkg] = await pool.query(
      "SELECT price FROM promotion_packages WHERE id = ?",
      [package_id],
    );
    if (!pkg.length)
      return res.status(404).json({ message: "Package not found" });
    const price = pkg[0].price;

    // Sanitize and validate campaign_id
    const parsedCampaignId = campaign_id || null;
    if (parsedCampaignId) {
      const [camp] = await pool.query(
        "SELECT id FROM campaigns WHERE id = ? AND brand_id = ?",
        [parsedCampaignId, bp[0].id],
      );
      if (!camp.length)
        return res
          .status(400)
          .json({ message: "Campaign not found or doesn't belong to you" });
    }

    const bookingId = randomUUID();
    await pool.query(
      "INSERT INTO bookings (id, brand_id, creator_id, package_id, campaign_id, price, notes) VALUES (?,?,?,?,?,?,?)",
      [
        bookingId,
        bp[0].id,
        creator_id,
        package_id,
        parsedCampaignId,
        price,
        notes,
      ],
    );

    // notify creator
    const [cp] = await pool.query(
      "SELECT user_id FROM creator_profiles WHERE id = ?",
      [creator_id],
    );
    if (cp.length) {
      await pool.query(
        "INSERT INTO notifications (id, user_id, message) VALUES (UUID(), ?, ?)",
        [cp[0].user_id, `New booking request from a brand. Booking #${bookingId}`],
      );
    }
    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ?", [
      bookingId,
    ]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createBooking error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/bookings
const getBookings = async (req, res) => {
  try {
    let query, params;
    if (req.user.role === "brand") {
      const [bp] = await pool.query(
        "SELECT id FROM brand_profiles WHERE user_id = ?",
        [req.user.id],
      );
      if (!bp.length) return res.json([]);
      query = `
        SELECT b.*, cp.username AS creator_username, u.name AS creator_name, u.avatar_url AS creator_avatar,
               cp.user_id AS creator_user_id, pkg.package_name, p.payment_status,
               b.content_url, b.content_type, b.content_note, b.rejection_reason
        FROM bookings b
        JOIN creator_profiles cp ON b.creator_id = cp.id
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN promotion_packages pkg ON b.package_id = pkg.id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE b.brand_id = ? ORDER BY b.created_at DESC`;
      params = [bp[0].id];
    } else if (req.user.role === "creator") {
      const [cp] = await pool.query(
        "SELECT id FROM creator_profiles WHERE user_id = ?",
        [req.user.id],
      );
      if (!cp.length) return res.json([]);
      query = `
        SELECT b.*, bp.company_name AS brand_name, u.avatar_url AS brand_avatar,
               pkg.package_name, p.payment_status,
               b.content_url, b.content_type, b.content_note, b.rejection_reason
        FROM bookings b
        JOIN brand_profiles bp ON b.brand_id = bp.id
        JOIN users u ON bp.user_id = u.id
        LEFT JOIN promotion_packages pkg ON b.package_id = pkg.id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE b.creator_id = ? ORDER BY b.created_at DESC`;
      params = [cp[0].id];
    } else {
      query = `
        SELECT b.*, bp.company_name AS brand_name, cp.username AS creator_username
        FROM bookings b
        JOIN brand_profiles bp ON b.brand_id = bp.id
        JOIN creator_profiles cp ON b.creator_id = cp.id
        ORDER BY b.created_at DESC LIMIT 100`;
      params = [];
    }
    const [rows] = await pool.query(query, params);

    // For brands, attach the Razorpay key to the first booking (or as a separate field)
    // so the frontend can show a "Test Mode" badge if applicable.
    if (req.user.role === "brand" && rows.length > 0) {
      rows[0].razorpay_key = process.env.RAZORPAY_KEY_ID;
    }

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT b.*, cp.username AS creator_username, u_c.name AS creator_name, u_c.avatar_url AS creator_avatar,
              bp.company_name AS brand_name, u_b.avatar_url AS brand_avatar,
              pkg.package_name, pkg.description AS package_desc, pkg.delivery_days,
              p.payment_status, p.razorpay_order_id, p.razorpay_payment_id, p.amount AS paid_amount,
              ew.status AS escrow_status
       FROM bookings b
       JOIN creator_profiles cp ON b.creator_id = cp.id
       JOIN users u_c ON cp.user_id = u_c.id
       JOIN brand_profiles bp ON b.brand_id = bp.id
       JOIN users u_b ON bp.user_id = u_b.id
       LEFT JOIN promotion_packages pkg ON b.package_id = pkg.id
       LEFT JOIN payments p ON p.booking_id = b.id
       LEFT JOIN escrow_wallet ew ON ew.booking_id = b.id
       WHERE b.id = ?`,
      [id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Booking not found" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const [booking] = await pool.query("SELECT * FROM bookings WHERE id = ?", [
      id,
    ]);
    if (!booking.length)
      return res.status(404).json({ message: "Booking not found" });
    const b = booking[0];

    await pool.query("UPDATE bookings SET status=? WHERE id=?", [status, id]);

    // If completed → release escrow
    if (status === "completed") {
      await pool.query("UPDATE escrow_wallet SET status=? WHERE booking_id=?", [
        "released",
        id,
      ]);
      // Insert earnings only if not exists
      const [existingEarning] = await pool.query(
        "SELECT id FROM creator_earnings WHERE booking_id = ?",
        [id],
      );
      if (!existingEarning.length) {
        await pool.query(
          "INSERT INTO creator_earnings (creator_id, booking_id, amount, status) VALUES (?,?,?,'paid')",
          [b.creator_id, id, b.price],
        );
      }
      // notify creator
      const [cp] = await pool.query(
        "SELECT user_id FROM creator_profiles WHERE id = ?",
        [b.creator_id],
      );
      if (cp.length) {
        await pool.query(
          "INSERT INTO notifications (user_id, message) VALUES (?,?)",
          [cp[0].user_id, `Payment released! Booking #${id} completed.`],
        );
      }
    }

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ?", [
      id,
    ]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
};
