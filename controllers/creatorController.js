const pool = require("../db");
const { randomUUID } = require("crypto");

// GET /api/creators/categories - dynamic list of distinct categories from DB
const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT category FROM creator_profiles WHERE category IS NOT NULL AND category != '' ORDER BY category ASC",
    );
    const categories = rows.map((r) => r.category);
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/creators - list creators with filters
const getCreators = async (req, res) => {
  const {
    category,
    platform,
    min_followers,
    max_price,
    location,
    search,
    page = 1,
    limit = 12,
  } = req.query;
  const offset = (page - 1) * limit;
  let conditions = [];
  let params = [];

  if (category) {
    conditions.push(`cp.category LIKE ?`);
    params.push(`%${category}%`);
  }
  if (location) {
    conditions.push(`(cp.city LIKE ? OR cp.country LIKE ?)`);
    params.push(`%${location}%`, `%${location}%`);
  }
  if (search) {
    conditions.push(`(u.name LIKE ? OR cp.username LIKE ? OR cp.bio LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  // Platform filter: creator must have at least one platform matching
  if (platform) {
    conditions.push(
      `EXISTS (SELECT 1 FROM creator_platforms plt2 WHERE plt2.creator_id = cp.id AND plt2.platform_name LIKE ?)`,
    );
    params.push(`%${platform}%`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  let havingParts = [];
  if (min_followers)
    havingParts.push(`MAX(plt.followers) >= ${parseInt(min_followers)}`);
  if (max_price) havingParts.push(`MIN(pkg.price) <= ${parseFloat(max_price)}`);
  const havingClause = havingParts.length
    ? `HAVING ${havingParts.join(" AND ")}`
    : "";

  try {
    const query = `
      SELECT cp.id, cp.username, cp.bio, cp.category, cp.city, cp.country,
             cp.verified, cp.rating, cp.created_at,
             u.name, u.avatar_url,
             MIN(pkg.price) AS min_price,
             MAX(plt.followers) AS max_followers
      FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN creator_platforms plt ON plt.creator_id = cp.id
      LEFT JOIN promotion_packages pkg ON pkg.creator_id = cp.id
      ${whereClause}
      GROUP BY cp.id, cp.username, cp.bio, cp.category, cp.city, cp.country,
               cp.verified, cp.rating, cp.created_at, u.name, u.avatar_url
      ${havingClause}
      ORDER BY cp.rating DESC, cp.verified DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [
      ...params,
      parseInt(limit),
      parseInt(offset),
    ]);

    // fetch platforms for each creator
    const creatorIds = rows.map((r) => r.id);
    let platformMap = {};
    if (creatorIds.length) {
      const [platforms] = await pool.query(
        `SELECT creator_id, platform_name, followers, engagement_rate FROM creator_platforms WHERE creator_id IN (?)`,
        [creatorIds],
      );
      platforms.forEach((p) => {
        if (!platformMap[p.creator_id]) platformMap[p.creator_id] = [];
        platformMap[p.creator_id].push({
          platform: p.platform_name,
          followers: p.followers,
          engagement_rate: p.engagement_rate,
        });
      });
    }
    const creators = rows.map((r) => ({
      ...r,
      platforms: platformMap[r.id] || [],
    }));

    const countQuery = `
      SELECT COUNT(DISTINCT cp.id) AS count FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN creator_platforms plt ON plt.creator_id = cp.id
      ${whereClause}
    `;
    const [countResult] = await pool.query(countQuery, params);
    const total = parseInt(countResult[0].count);

    return res.json({
      creators,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getCreators error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/creators/:username
const getCreatorByUsername = async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, u.name, u.email, u.avatar_url FROM creator_profiles cp
       JOIN users u ON cp.user_id = u.id WHERE cp.username = ?`,
      [username],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Creator not found" });
    const creator = rows[0];

    const [platforms] = await pool.query(
      "SELECT * FROM creator_platforms WHERE creator_id = ?",
      [creator.id],
    );
    const [packages] = await pool.query(
      "SELECT * FROM promotion_packages WHERE creator_id = ?",
      [creator.id],
    );
    const [reviews] = await pool.query(
      `SELECT r.*, u.name AS brand_name, u.avatar_url AS brand_avatar
       FROM reviews r
       JOIN brand_profiles bp ON r.brand_id = bp.id
       JOIN users u ON bp.user_id = u.id
       WHERE r.creator_id = ? ORDER BY r.created_at DESC LIMIT 10`,
      [creator.id],
    );
    return res.json({ ...creator, platforms, packages, reviews });
  } catch (err) {
    console.error("getCreatorByUsername error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/creators/me/profile
const getMyProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Creator profile not found" });
    const cp = rows[0];
    const [platforms] = await pool.query(
      "SELECT * FROM creator_platforms WHERE creator_id = ?",
      [cp.id],
    );
    const [packages] = await pool.query(
      "SELECT * FROM promotion_packages WHERE creator_id = ?",
      [cp.id],
    );
    return res.json({ ...cp, platforms, packages });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/creators/me/profile
const updateMyProfile = async (req, res) => {
  const { bio, category, city, country, username } = req.body;
  try {
    await pool.query(
      "UPDATE creator_profiles SET bio=?, category=?, city=?, country=?, username=? WHERE user_id=?",
      [bio, category, city, country, username, req.user.id],
    );
    const [rows] = await pool.query(
      "SELECT * FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/creators/me/platforms
const addPlatform = async (req, res) => {
  const { platform_name, username, profile_url, followers, engagement_rate } =
    req.body;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(404).json({ message: "Profile not found" });
    const platformId = randomUUID();
    await pool.query(
      "INSERT INTO creator_platforms (id, creator_id, platform_name, username, profile_url, followers, engagement_rate) VALUES (?,?,?,?,?,?,?)",
      [
        platformId,
        cp[0].id,
        platform_name,
        username,
        profile_url,
        followers,
        engagement_rate,
      ],
    );
    const [rows] = await pool.query(
      "SELECT * FROM creator_platforms WHERE id = ?",
      [platformId],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/creators/me/packages
const addPackage = async (req, res) => {
  const { package_name, description, price, delivery_days } = req.body;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(404).json({ message: "Profile not found" });
    const pkgId = randomUUID();
    await pool.query(
      "INSERT INTO promotion_packages (id, creator_id, package_name, description, price, delivery_days) VALUES (?,?,?,?,?,?)",
      [pkgId, cp[0].id, package_name, description, price, delivery_days],
    );
    const [rows] = await pool.query(
      "SELECT * FROM promotion_packages WHERE id = ?",
      [pkgId],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err });
  }
};

// PUT /api/creators/me/packages/:id
const updatePackage = async (req, res) => {
  const { id } = req.params;
  const { package_name, description, price, delivery_days } = req.body;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    await pool.query(
      "UPDATE promotion_packages SET package_name=?, description=?, price=?, delivery_days=? WHERE id=? AND creator_id=?",
      [package_name, description, price, delivery_days, id, cp[0].id],
    );
    const [rows] = await pool.query(
      "SELECT * FROM promotion_packages WHERE id = ?",
      [id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Package not found" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/creators/me/packages/:id
const deletePackage = async (req, res) => {
  const { id } = req.params;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    await pool.query(
      "DELETE FROM promotion_packages WHERE id=? AND creator_id=?",
      [id, cp[0].id],
    );
    return res.json({ message: "Package deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/creators/me/earnings
const getEarnings = async (req, res) => {
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(404).json({ message: "Profile not found" });
    const [earnings] = await pool.query(
      `SELECT ce.*, b.created_at AS booking_date,
              u.name AS brand_name, pkg.package_name
       FROM creator_earnings ce
       JOIN bookings b ON ce.booking_id = b.id
       JOIN brand_profiles bp ON b.brand_id = bp.id
       JOIN users u ON bp.user_id = u.id
       LEFT JOIN promotion_packages pkg ON b.package_id = pkg.id
       WHERE ce.creator_id = ? ORDER BY ce.created_at DESC`,
      [cp[0].id],
    );
    const total = earnings.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return res.json({ earnings, total });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
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
};
