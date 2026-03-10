const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getMessages,
  sendMessage,
  getNotifications,
  markAllRead,
} = require("../controllers/messageController");

router.get("/", auth, getMessages);
router.post("/", auth, sendMessage);
router.get("/notifications", auth, getNotifications);
router.put("/notifications/read", auth, markAllRead);

module.exports = router;
