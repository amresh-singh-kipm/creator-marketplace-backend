const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  getCollaborations,
  createCollaboration,
  getCollaborationById,
  applyToCollaboration,
  acceptRequest,
  rejectRequest,
  completeCollaboration,
  getMyCollaborations,
  getCollaborationMessages,
  postCollaborationMessage,
} = require("../controllers/collaborationController");

router.get("/", getCollaborations);
router.post("/", auth, requireRole("creator"), createCollaboration);
router.get("/my", auth, requireRole("creator"), getMyCollaborations);
router.get("/:id", getCollaborationById);
router.get(
  "/:id/messages",
  auth,
  requireRole("creator"),
  getCollaborationMessages,
);
router.post(
  "/:id/messages",
  auth,
  requireRole("creator"),
  postCollaborationMessage,
);
router.post("/:id/apply", auth, requireRole("creator"), applyToCollaboration);
router.post("/:id/accept", auth, requireRole("creator"), acceptRequest);
router.post("/:id/reject", auth, requireRole("creator"), rejectRequest);
router.post(
  "/:id/complete",
  auth,
  requireRole("creator"),
  completeCollaboration,
);

module.exports = router;
