const pool = require("../db");

// POST /api/campaigns
const createCampaign = async (req, res) => {
  const { title, description, budget, category } = req.body;
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!bp.length)
      return res.status(404).json({ message: "Brand profile not found" });
    const [result] = await pool.query(
      "INSERT INTO campaigns (brand_id, title, description, budget, category) VALUES (?,?,?,?,?)",
      [bp[0].id, title, description, budget, category],
    );
    const [rows] = await pool.query("SELECT * FROM campaigns WHERE id = ?", [
      result.insertId,
    ]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/campaigns
const getCampaigns = async (req, res) => {
  const { status, category, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  let conditions = [];
  let params = [];
  if (status) {
    conditions.push(`c.status = ?`);
    params.push(status);
  }
  if (category) {
    conditions.push(`c.category LIKE ?`);
    params.push(`%${category}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const [rows] = await pool.query(
      `SELECT c.*, bp.company_name, u.avatar_url AS brand_avatar
       FROM campaigns c
       JOIN brand_profiles bp ON c.brand_id = bp.id
       JOIN users u ON bp.user_id = u.id
       ${where}
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)],
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/campaigns/my
const getMyCampaigns = async (req, res) => {
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!bp.length)
      return res.status(404).json({ message: "Brand profile not found" });
    const [rows] = await pool.query(
      "SELECT * FROM campaigns WHERE brand_id = ? ORDER BY created_at DESC",
      [bp[0].id],
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/campaigns/:id
const updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { title, description, budget, category, status } = req.body;
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    await pool.query(
      "UPDATE campaigns SET title=?, description=?, budget=?, category=?, status=? WHERE id=? AND brand_id=?",
      [title, description, budget, category, status, id, bp[0].id],
    );
    const [rows] = await pool.query("SELECT * FROM campaigns WHERE id = ?", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ message: "Campaign not found" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/campaigns/:id
const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const [bp] = await pool.query(
      "SELECT id FROM brand_profiles WHERE user_id = ?",
      [req.user.id],
    );
    await pool.query("DELETE FROM campaigns WHERE id=? AND brand_id=?", [
      id,
      bp[0].id,
    ]);
    return res.json({ message: "Campaign deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getMyCampaigns,
  updateCampaign,
  deleteCampaign,
};
