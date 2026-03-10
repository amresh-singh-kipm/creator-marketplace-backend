const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  createReview,
  getReviewsForCreator,
  getMyReviews,
  getMyReviewsAsBrand,
} = require("../controllers/reviewController");

router.post("/", auth, requireRole("brand"), createReview);
router.get("/creator/:creator_id", getReviewsForCreator);
router.get("/my", auth, requireRole("creator"), getMyReviews);
router.get("/brand/my", auth, requireRole("brand"), getMyReviewsAsBrand);

module.exports = router;
