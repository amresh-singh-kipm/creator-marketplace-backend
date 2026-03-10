const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
} = require("../controllers/bookingController");
const {
  upload,
  submitContent,
  rejectContent,
} = require("../controllers/contentController");

router.post("/", auth, createBooking);
router.get("/", auth, getBookings);
router.get("/:id", auth, getBookingById);
router.put("/:id/status", auth, updateBookingStatus);
router.post(
  "/:id/submit-content",
  auth,
  upload.single("content_file"),
  submitContent,
);
router.post("/:id/reject-content", auth, rejectContent);

module.exports = router;
