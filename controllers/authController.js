const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const pool = require("../db");

const signup = async (req, res) => {
  const { name, email, password, role, company_name, username } = req.body;
  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ message: "Name, email, password, and role are required" });
  }
  if (!["creator", "brand", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      name,
    )}`;
    const userId = randomUUID();
    await pool.query(
      "INSERT INTO users (id, name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, name, email, hashed, role, avatarUrl],
    );

    // Create role-specific profile
    if (role === "creator") {
      const uname = username || email.split("@")[0];
      await pool.query(
        "INSERT INTO creator_profiles (id, user_id, username) VALUES (UUID(), ?, ?)",
        [userId, uname],
      );
    } else if (role === "brand") {
      const cname = company_name || name;
      await pool.query(
        "INSERT INTO brand_profiles (id, user_id, company_name) VALUES (UUID(), ?, ?)",
        [userId, cname],
      );
    }

    const [users] = await pool.query(
      "SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?",
      [userId],
    );
    const user = users[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const { password: _p, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?",
      [req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login, getMe };
