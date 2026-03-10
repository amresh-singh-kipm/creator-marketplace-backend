const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const pool = require("../db");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// ─── Helper: find or create a user from OAuth profile ───────────────────────
async function findOrCreateOAuthUser({
  provider,
  providerId,
  email,
  name,
  avatarUrl,
}) {
  const idColumn = provider === "google" ? "google_id" : "github_id";

  // 1. Try to find by provider ID
  const [byProvider] = await pool.query(
    `SELECT * FROM users WHERE ${idColumn} = ?`,
    [providerId],
  );
  if (byProvider.length) return byProvider[0];

  // 2. Try to find by email (link accounts)
  if (email) {
    const [byEmail] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (byEmail.length) {
      // Link this provider to the existing account
      await pool.query(
        `UPDATE users SET ${idColumn} = ?, social_provider = ? WHERE id = ?`,
        [providerId, provider, byEmail[0].id],
      );
      return byEmail[0];
    }
  }

  // 3. Create new user (default role = creator, can change after login)
  const finalEmail = email || `${provider}_${providerId}@noemail.local`;
  const [result] = await pool.query(
    `INSERT INTO users (name, email, avatar_url, role, ${idColumn}, social_provider)
     VALUES (?, ?, ?, 'creator', ?, ?)`,
    [name, finalEmail, avatarUrl, providerId, provider],
  );
  const userId = result.insertId;

  // Auto-create creator profile
  const username =
    (name || "user").toLowerCase().replace(/\s+/g, "_") + "_" + userId;
  await pool.query(
    "INSERT INTO creator_profiles (user_id, username) VALUES (?, ?)",
    [userId, username],
  );

  const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [
    userId,
  ]);
  return newUser[0];
}

// ─── Google Strategy ─────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value;
        const user = await findOrCreateOAuthUser({
          provider: "google",
          providerId: profile.id,
          email,
          name: profile.displayName,
          avatarUrl,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

// ─── GitHub Strategy ─────────────────────────────────────────────────────────
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/api/auth/github/callback`,
      scope: ["user:email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value;
        const user = await findOrCreateOAuthUser({
          provider: "github",
          providerId: String(profile.id),
          email,
          name: profile.displayName || profile.username,
          avatarUrl,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

// Minimal session serialize (only used during the OAuth redirect, then JWT takes over)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
