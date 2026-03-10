const pool = require("../db");

// POST /api/collaboration-reviews
const submitReview = async (req, res) => {
  const { collaboration_id, creator_id, rating, comment } = req.body;
  if (!collaboration_id || !creator_id || !rating)
    return res
      .status(400)
      .json({ message: "collaboration_id, creator_id, and rating required" });

  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res
        .status(403)
        .json({ message: "Only creators can leave reviews" });

    // Must be a participant in this collaboration
    const [isParticipant] = await pool.query(
      "SELECT id FROM collaboration_participants WHERE collaboration_id = ? AND creator_id = ?",
      [collaboration_id, cp[0].id],
    );
    if (!isParticipant.length)
      return res
        .status(403)
        .json({ message: "You must be a participant to review" });

    // Cannot review yourself
    if (parseInt(creator_id) === cp[0].id)
      return res.status(400).json({ message: "Cannot review yourself" });

    // Collab must be completed
    const [collab] = await pool.query(
      "SELECT status FROM collaborations WHERE id = ?",
      [collaboration_id],
    );
    if (!collab.length || collab[0].status !== "completed")
      return res
        .status(400)
        .json({ message: "Collaboration must be completed before reviewing" });

    const [result] = await pool.query(
      "INSERT INTO collaboration_reviews (collaboration_id, reviewer_id, creator_id, rating, comment) VALUES (?,?,?,?,?)",
      [collaboration_id, cp[0].id, creator_id, rating, comment],
    );

    // Update collaboration_rating on creator_profiles
    await pool.query(
      `UPDATE creator_profiles SET collaboration_rating = (
        SELECT ROUND(AVG(rating), 2) FROM collaboration_reviews WHERE creator_id = ?
      ) WHERE id = ?`,
      [creator_id, creator_id],
    );

    // Notify reviewed creator
    const [reviewed] = await pool.query(
      "SELECT user_id FROM creator_profiles WHERE id = ?",
      [creator_id],
    );
    if (reviewed.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          reviewed[0].user_id,
          `You received a ${rating}⭐ collaboration review!`,
        ],
      );
    }

    const [rows] = await pool.query(
      "SELECT * FROM collaboration_reviews WHERE id = ?",
      [result.insertId],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Review already submitted" });
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/collaboration-reviews/creator/:creator_id
const getReviewsForCreator = async (req, res) => {
  const { creator_id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT cr.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar,
              c.title AS collaboration_title
       FROM collaboration_reviews cr
       JOIN creator_profiles cp ON cr.reviewer_id = cp.id
       JOIN users u ON cp.user_id = u.id
       JOIN collaborations c ON cr.collaboration_id = c.id
       WHERE cr.creator_id = ? ORDER BY cr.created_at DESC`,
      [creator_id],
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { submitReview, getReviewsForCreator };
