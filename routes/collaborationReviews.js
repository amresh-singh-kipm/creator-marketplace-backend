const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  submitReview,
  getReviewsForCreator,
} = require("../controllers/collaborationReviewController");

router.post("/", auth, submitReview);
router.get("/creator/:creator_id", getReviewsForCreator);

module.exports = router;
