const pool = require("../db");
const { randomUUID } = require("crypto");

// GET /api/collaborations
const getCollaborations = async (req, res) => {
  const {
    platform,
    category,
    location,
    followers_required,
    page = 1,
    limit = 12,
  } = req.query;
  const offset = (page - 1) * limit;
  let conditions = ["c.status IN ('open', 'in_progress')"];
  let params = [];

  if (platform) {
    conditions.push("c.platform LIKE ?");
    params.push(`%${platform}%`);
  }
  if (category) {
    conditions.push("c.category LIKE ?");
    params.push(`%${category}%`);
  }
  if (location) {
    conditions.push("c.location LIKE ?");
    params.push(`%${location}%`);
  }
  if (followers_required) {
    conditions.push("c.followers_required <= ?");
    params.push(parseInt(followers_required));
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name AS creator_name, u.avatar_url AS creator_avatar,
              cp.username AS creator_username, cp.rating AS creator_rating,
              cp.collaboration_rating, cp.verified,
              (SELECT COUNT(*) FROM collaboration_requests cr WHERE cr.collaboration_id = c.id) AS request_count
       FROM collaborations c
       JOIN creator_profiles cp ON c.creator_id = cp.id
       JOIN users u ON cp.user_id = u.id
       ${where}
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)],
    );
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM collaborations c ${where}`,
      params,
    );
    return res.json({
      collaborations: rows,
      total: parseInt(count),
      page: parseInt(page),
      pages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error("getCollaborations error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collaborations
const createCollaboration = async (req, res) => {
  const {
    title,
    description,
    platform,
    category,
    location,
    followers_required,
    collaboration_type,
  } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res
        .status(403)
        .json({ message: "Only creators can post collaborations" });

    const collabId = randomUUID();
    await pool.query(
      `INSERT INTO collaborations (id, creator_id, title, description, platform, category, location, followers_required, collaboration_type)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        collabId,
        cp[0].id,
        title,
        description,
        platform,
        category,
        location,
        followers_required || 0,
        collaboration_type,
      ],
    );
    // Owner auto-joins as host
    await pool.query(
      "INSERT INTO collaboration_participants (id, collaboration_id, creator_id, role) VALUES (UUID(),?,?,'host')",
      [collabId, cp[0].id],
    );
    const [rows] = await pool.query(
      "SELECT * FROM collaborations WHERE id = ?",
      [collabId],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createCollaboration error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/collaborations/:id
const getCollaborationById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name AS creator_name, u.avatar_url AS creator_avatar,
              cp.username AS creator_username, cp.rating AS creator_rating, cp.collaboration_rating, cp.verified
       FROM collaborations c
       JOIN creator_profiles cp ON c.creator_id = cp.id
       JOIN users u ON cp.user_id = u.id
       WHERE c.id = ?`,
      [id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Collaboration not found" });
    const collab = rows[0];

    // Fetch participants
    const [participants] = await pool.query(
      `SELECT cp2.id, cp2.username, cp2.rating, cp2.collaboration_rating,
              u2.name, u2.avatar_url, cp_join.role, cp_join.joined_at
       FROM collaboration_participants cp_join
       JOIN creator_profiles cp2 ON cp_join.creator_id = cp2.id
       JOIN users u2 ON cp2.user_id = u2.id
       WHERE cp_join.collaboration_id = ?`,
      [id],
    );
    // Fetch requests (for owner)
    const [requests] = await pool.query(
      `SELECT cr.*, cp2.username AS applicant_username, u2.name AS applicant_name,
              u2.avatar_url AS applicant_avatar, cp2.rating AS applicant_rating
       FROM collaboration_requests cr
       JOIN creator_profiles cp2 ON cr.creator_id = cp2.id
       JOIN users u2 ON cp2.user_id = u2.id
       WHERE cr.collaboration_id = ? ORDER BY cr.created_at DESC`,
      [id],
    );
    // Fetch reviews
    const [reviews] = await pool.query(
      `SELECT cr.*, u_rev.name AS reviewer_name, u_rev.avatar_url AS reviewer_avatar
       FROM collaboration_reviews cr
       JOIN creator_profiles cp_rev ON cr.reviewer_id = cp_rev.id
       JOIN users u_rev ON cp_rev.user_id = u_rev.id
       WHERE cr.collaboration_id = ? ORDER BY cr.created_at DESC`,
      [id],
    );

    return res.json({ ...collab, participants, requests, reviews });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collaborations/:id/apply
const applyToCollaboration = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(403).json({ message: "Only creators can apply" });

    const [collab] = await pool.query(
      "SELECT * FROM collaborations WHERE id = ?",
      [id],
    );
    if (!collab.length)
      return res.status(404).json({ message: "Collaboration not found" });
    if (collab[0].status !== "open")
      return res.status(400).json({ message: "Collaboration is not open" });
    if (collab[0].creator_id === cp[0].id)
      return res
        .status(400)
        .json({ message: "Cannot apply to your own collaboration" });

    // Check already applied
    const [existing] = await pool.query(
      "SELECT id FROM collaboration_requests WHERE collaboration_id = ? AND creator_id = ?",
      [id, cp[0].id],
    );
    if (existing.length)
      return res.status(409).json({ message: "Already applied" });

    const requestId = randomUUID();
    await pool.query(
      "INSERT INTO collaboration_requests (id, collaboration_id, creator_id, message) VALUES (?,?,?,?)",
      [requestId, id, cp[0].id, message || null],
    );
    // Notify owner
    const [owner] = await pool.query(
      "SELECT cp2.user_id FROM creator_profiles cp2 WHERE cp2.id = ?",
      [collab[0].creator_id],
    );
    if (owner.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          owner[0].user_id,
          `New collaboration request for "${collab[0].title}"`,
        ],
      );
    }
    const [rows] = await pool.query(
      "SELECT * FROM collaboration_requests WHERE id = ?",
      [requestId],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collaborations/:id/accept  (body: { request_id })
const acceptRequest = async (req, res) => {
  const { id } = req.params;
  const { request_id } = req.body;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    const [collab] = await pool.query(
      "SELECT * FROM collaborations WHERE id = ? AND creator_id = ?",
      [id, cp[0]?.id],
    );
    if (!collab.length)
      return res.status(403).json({ message: "Not the collaboration owner" });

    const [req_row] = await pool.query(
      "SELECT * FROM collaboration_requests WHERE id = ? AND collaboration_id = ?",
      [request_id, id],
    );
    if (!req_row.length)
      return res.status(404).json({ message: "Request not found" });

    await pool.query(
      "UPDATE collaboration_requests SET status='accepted' WHERE id=?",
      [request_id],
    );
    await pool.query(
      "UPDATE collaborations SET status='in_progress' WHERE id=?",
      [id],
    );

    // Add as participant
    await pool.query(
      `INSERT IGNORE INTO collaboration_participants (collaboration_id, creator_id, role) VALUES (?,?,'collaborator')`,
      [id, req_row[0].creator_id],
    );

    // Auto-create a chat message thread to kick off conversation
    const [applicantUser] = await pool.query(
      "SELECT user_id FROM creator_profiles WHERE id = ?",
      [req_row[0].creator_id],
    );
    if (applicantUser.length) {
      await pool.query(
        "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?,?,?)",
        [
          req.user.id,
          applicantUser[0].user_id,
          `Your collaboration request for "${collab[0].title}" was accepted! Let's discuss the details here.`,
        ],
      );
      // Notify applicant
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          applicantUser[0].user_id,
          `Your collaboration request for "${collab[0].title}" was accepted! 🎉`,
        ],
      );
    }

    return res.json({
      message: "Request accepted, collaboration is now in progress",
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collaborations/:id/reject  (body: { request_id })
const rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { request_id } = req.body;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    const [collab] = await pool.query(
      "SELECT * FROM collaborations WHERE id = ? AND creator_id = ?",
      [id, cp[0]?.id],
    );
    if (!collab.length)
      return res.status(403).json({ message: "Not the collaboration owner" });

    await pool.query(
      "UPDATE collaboration_requests SET status='rejected' WHERE id=? AND collaboration_id=?",
      [request_id, id],
    );
    return res.json({ message: "Request rejected" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collaborations/:id/complete
const completeCollaboration = async (req, res) => {
  const { id } = req.params;
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    const [collab] = await pool.query(
      "SELECT * FROM collaborations WHERE id = ? AND creator_id = ?",
      [id, cp[0]?.id],
    );
    if (!collab.length)
      return res.status(403).json({ message: "Not the collaboration owner" });

    await pool.query(
      "UPDATE collaborations SET status='completed' WHERE id=?",
      [id],
    );

    // Notify all participants
    const [participants] = await pool.query(
      `SELECT cp2.user_id FROM collaboration_participants cp_join
       JOIN creator_profiles cp2 ON cp_join.creator_id = cp2.id
       WHERE cp_join.collaboration_id = ? AND cp_join.creator_id != ?`,
      [id, cp[0].id],
    );
    for (const p of participants) {
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES (?,?)",
        [
          p.user_id,
          `Collaboration "${collab[0].title}" has been marked complete. Please leave a review!`,
        ],
      );
    }

    return res.json({ message: "Collaboration marked as completed" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/collaborations/my
const getMyCollaborations = async (req, res) => {
  console.log("first");
  try {
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    console.log(cp);
    if (!cp.length) return res.json([]);

    const [owned] = await pool.query(
      `SELECT c.*, 'owner' AS my_role FROM collaborations c WHERE c.creator_id = ? ORDER BY c.created_at DESC`,
      [cp[0].id],
    );
    const [participating] = await pool.query(
      `SELECT c.*, cp_join.role AS my_role FROM collaborations c
       JOIN collaboration_participants cp_join ON cp_join.collaboration_id = c.id
       WHERE cp_join.creator_id = ? AND c.creator_id != ?
       ORDER BY c.created_at DESC`,
      [cp[0].id, cp[0].id],
    );

    return res.json({ owned, participating });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/collaborations/:id/messages
const getCollaborationMessages = async (req, res) => {
  const { id } = req.params;
  try {
    const [messages] = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar, cp.username AS sender_username
       FROM collaboration_messages m
       JOIN users u ON m.sender_id = u.id
       JOIN creator_profiles cp ON cp.user_id = u.id
       WHERE m.collaboration_id = ?
       ORDER BY m.created_at ASC`,
      [id],
    );
    return res.json(messages);
  } catch (err) {
    console.error("getCollaborationMessages error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collaborations/:id/messages
const postCollaborationMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  try {
    // Check if user is a participant
    const [cp] = await pool.query(
      "SELECT id FROM creator_profiles WHERE user_id = ?",
      [req.user.id],
    );
    if (!cp.length)
      return res.status(403).json({ message: "Profile not found" });

    const [participant] = await pool.query(
      "SELECT id FROM collaboration_participants WHERE collaboration_id = ? AND creator_id = ?",
      [id, cp[0].id],
    );

    if (!participant.length) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this collaboration" });
    }

    const messageId = randomUUID();
    await pool.query(
      "INSERT INTO collaboration_messages (id, collaboration_id, sender_id, message) VALUES (?,?,?,?)",
      [messageId, id, req.user.id, message],
    );

    const [rows] = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar, cp.username AS sender_username
       FROM collaboration_messages m
       JOIN users u ON m.sender_id = u.id
       JOIN creator_profiles cp ON cp.user_id = u.id
       WHERE m.id = ?`,
      [messageId],
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("postCollaborationMessage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
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
};
