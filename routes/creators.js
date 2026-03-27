const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  getCategories,
  getCreators,
  getCreatorByUsername,
  getMyProfile,
  updateMyProfile,
  addPlatform,
  addPackage,
  updatePackage,
  deletePackage,
  getEarnings,
  uploadAvatar,
} = require("../controllers/creatorController");
const upload = require("../middleware/upload");

router.get("/categories", getCategories); // must be before /:username
router.get("/", getCreators);
router.get("/me/profile", auth, requireRole("creator"), getMyProfile);
router.post("/me/avatar", auth, requireRole("creator"), upload.single("avatar"), uploadAvatar);
router.put("/me/profile", auth, requireRole("creator"), updateMyProfile);
router.get("/me/earnings", auth, requireRole("creator"), getEarnings);
router.post("/me/platforms", auth, requireRole("creator"), addPlatform);
router.post("/me/packages", auth, requireRole("creator"), addPackage);
router.put("/me/packages/:id", auth, requireRole("creator"), updatePackage);
router.delete("/me/packages/:id", auth, requireRole("creator"), deletePackage);
router.get("/:username", getCreatorByUsername);

module.exports = router;
