const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  getUsers,
  updateUserRole,
  deleteUser,
  getPendingCreators,
  verifyCreator,
  getTransactions,
  getStats,
  releasePayment,
  getUserHistory,
  getPlatformProfit,
} = require("../controllers/adminController");
const {
  getAdminWithdrawals,
  updateWithdrawal,
} = require("../controllers/withdrawalController");

router.get("/stats", auth, requireRole("admin"), getStats);
router.get("/users", auth, requireRole("admin"), getUsers);
router.get("/users/:id/history", auth, requireRole("admin"), getUserHistory);
router.put("/users/:id/role", auth, requireRole("admin"), updateUserRole);
router.delete("/users/:id", auth, requireRole("admin"), deleteUser);
router.get("/creators/pending", auth, requireRole("admin"), getPendingCreators);
router.put("/creators/:id/verify", auth, requireRole("admin"), verifyCreator);
router.get("/transactions", auth, requireRole("admin"), getTransactions);
router.post(
  "/payments/:booking_id/release",
  auth,
  requireRole("admin"),
  releasePayment,
);
router.get("/platform-profit", auth, requireRole("admin"), getPlatformProfit);
router.get("/withdrawals", auth, requireRole("admin"), getAdminWithdrawals);
router.put("/withdrawals/:id", auth, requireRole("admin"), updateWithdrawal);

module.exports = router;
