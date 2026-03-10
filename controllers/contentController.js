const multer = require("multer");
const path = require("path");
const pool = require("../db");
const { auth } = require("../middleware/auth");

// ---------- Multer config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../uploads/content")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `content_${req.user.id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
  const ok =
    allowed.test(path.extname(file.originalname).toLowerCase()) ||
    allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error("Only images and videos are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ---------- POST /api/bookings/:id/submit-content ----------
const submitContent = async (req, res) => {
  const { id } = req.params;
  const { content_note } = req.body;

  try {
    const [booking] = await pool.query(
      `SELECT b.*, cp.user_id AS creator_user_id, p.payment_status
       FROM bookings b
       JOIN creator_profiles cp ON b.creator_id = cp.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'completed'
       WHERE b.id = ?`,
      [id],
    );
    if (!booking.length)
      return res.status(404).json({ message: "Booking not found" });

    const b = booking[0];
    if (b.creator_user_id !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });

    if (!["accepted", "content_rejected"].includes(b.status))
      return res.status(400).json({
        message:
          "Content can only be submitted for accepted or rejected bookings",
      });

    if (b.payment_status !== "completed")
      return res
        .status(400)
        .json({ message: "Brand must pay before content submission" });

    let content_url = null;
    let content_type = null;

    if (req.file) {
      // File upload
      const ext = path.extname(req.file.originalname).toLowerCase();
      const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
      content_type = videoExts.includes(ext) ? "video" : "image";
      content_url = `/uploads/content/${req.file.filename}`;
    } else if (req.body.content_url) {
      // URL submission (e.g. post link)
      content_url = req.body.content_url;
      content_type = "url";
    } else {
      return res
        .status(400)
        .json({ message: "Please upload a file or provide a content URL" });
    }

    await pool.query(
      "UPDATE bookings SET status='content_submitted', content_url=?, content_type=?, content_note=?, rejection_reason=NULL WHERE id=?",
      [content_url, content_type, content_note || null, id],
    );

    // Notify brand
    const [brand] = await pool.query(
      "SELECT bp.user_id FROM brand_profiles bp JOIN bookings bk ON bk.brand_id = bp.id WHERE bk.id = ?",
      [id],
    );
    if (brand.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          brand[0].user_id,
          `Creator has submitted content for Booking #${id}. Please review it.`,
        ],
      );
    }

    return res.json({
      success: true,
      message: "Content submitted successfully",
    });
  } catch (err) {
    console.error("submitContent error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- POST /api/bookings/:id/reject-content ----------
const rejectContent = async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  try {
    const [booking] = await pool.query(
      `SELECT b.*, bp.user_id AS brand_user_id
       FROM bookings b
       JOIN brand_profiles bp ON b.brand_id = bp.id
       WHERE b.id = ?`,
      [id],
    );
    if (!booking.length)
      return res.status(404).json({ message: "Booking not found" });

    const b = booking[0];
    if (b.brand_user_id !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });

    if (b.status !== "content_submitted")
      return res
        .status(400)
        .json({ message: "No submitted content to reject" });

    await pool.query(
      "UPDATE bookings SET status='content_rejected', rejection_reason=? WHERE id=?",
      [rejection_reason || "Content did not meet requirements", id],
    );

    // Notify creator
    const [creator] = await pool.query(
      "SELECT cp.user_id FROM creator_profiles cp JOIN bookings bk ON bk.creator_id = cp.id WHERE bk.id = ?",
      [id],
    );
    if (creator.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          creator[0].user_id,
          `Your content for Booking #${id} was rejected. Reason: ${rejection_reason || "Content did not meet requirements"}. Please resubmit.`,
        ],
      );
    }

    return res.json({ success: true, message: "Content rejected" });
  } catch (err) {
    console.error("rejectContent error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { upload, submitContent, rejectContent };
