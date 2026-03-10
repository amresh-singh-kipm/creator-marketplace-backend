const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  createOrder,
  verifyPayment,
  getPaymentByBooking,
  getAllPayments,
} = require("../controllers/paymentController");

router.post("/create-order", auth, requireRole("brand"), createOrder);
router.post("/verify", auth, requireRole("brand"), verifyPayment);
router.get("/booking/:booking_id", auth, getPaymentByBooking);
router.get("/all", auth, requireRole("admin"), getAllPayments);

module.exports = router;
