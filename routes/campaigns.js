const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  createCampaign,
  getCampaigns,
  getMyCampaigns,
  updateCampaign,
  deleteCampaign,
} = require("../controllers/campaignController");

router.get("/", getCampaigns);
router.get("/my", auth, requireRole("brand"), getMyCampaigns);
router.post("/", auth, requireRole("brand"), createCampaign);
router.put("/:id", auth, requireRole("brand"), updateCampaign);
router.delete("/:id", auth, requireRole("brand"), deleteCampaign);

module.exports = router;
