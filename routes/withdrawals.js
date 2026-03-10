const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getWithdrawals,
  requestWithdrawal,
} = require("../controllers/withdrawalController");

router.get("/", auth, getWithdrawals);
router.post("/", auth, requestWithdrawal);

module.exports = router;
