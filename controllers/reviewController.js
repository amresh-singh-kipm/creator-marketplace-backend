const pool = require("../db");

// POST /api/reviews
const createReview = async (req, res) => {
  const { booking_id, rating, comment } = req.body;
  if (!booking_id || !rating)
    return res.status(400).json({ message: "booking_id and rating required" });
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!bp.length)
      return res.status(403).json({ message: "Only brands can leave reviews" });

    const [booking] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? AND brand_id = ? AND status = 'completed'",
      [booking_id, bp[0].id],
    );
    if (!booking.length)
      return res
        .status(400)
        .json({ message: "Booking not completed or not yours" });

    // Check if review already exists
    const [existing] = await pool.query(
      "SELECT id FROM reviews WHERE booking_id = ?",
      [booking_id],
    );
    if (existing.length)
      return res
        .status(409)
        .json({ message: "Review already submitted for this booking" });

    const [result] = await pool.query(
      "INSERT INTO reviews (booking_id, brand_id, creator_id, rating, comment) VALUES (?,?,?,?,?)",
      [booking_id, bp[0].id, booking[0].creator_id, rating, comment],
    );

    // Manually update creator rating (trigger handles DB-side, but we also return updated)
    await pool.query(
      `UPDATE creator_profiles SET rating = (
         SELECT ROUND(AVG(rating), 2) FROM reviews WHERE creator_id = ?
       ) WHERE id = ?`,
      [booking[0].creator_id, booking[0].creator_id],
    );

    const [rows] = await pool.query("SELECT * FROM reviews WHERE id = ?", [
      result.insertId,
    ]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/reviews/creator/:creator_id
const getReviewsForCreator = async (req, res) => {
  const { creator_id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS brand_name, u.avatar_url AS brand_avatar
       FROM reviews r
       JOIN brand_profiles bp ON r.brand_id = bp.id
       JOIN users u ON bp.user_id = u.id
       WHERE r.creator_id = ? ORDER BY r.created_at DESC`,
      [creator_id],
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/reviews/my
const getMyReviews = async (req, res) => {
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(404).json({ message: "Creator profile not found" });
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS brand_name, u.avatar_url AS brand_avatar
       FROM reviews r
       JOIN brand_profiles bp ON r.brand_id = bp.id
       JOIN users u ON bp.user_id = u.id
       WHERE r.creator_id = ? ORDER BY r.created_at DESC`,
      [cp[0].id],
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/reviews/brand/my — brand views all reviews they submitted
const getMyReviewsAsBrand = async (req, res) => {
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!bp.length)
      return res.status(404).json({ message: "Brand profile not found" });
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS creator_name, u.avatar_url AS creator_avatar,
              cp.username AS creator_username, b.id AS booking_id_ref
       FROM reviews r
       JOIN creator_profiles cp ON r.creator_id = cp.id
       JOIN users u ON cp.user_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       WHERE r.brand_id = ? ORDER BY r.created_at DESC`,
      [bp[0].id],
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createReview,
  getReviewsForCreator,
  getMyReviews,
  getMyReviewsAsBrand,
};
