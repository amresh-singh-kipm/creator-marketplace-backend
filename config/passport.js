const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
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
  const idColumn =
    provider === "google"
      ? "google_id"
      : provider === "facebook"
        ? "facebook_id"
        : "github_id";

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
  const userId = require("crypto").randomUUID();
  // Provide a random unguessable password hash to satisfy NOT NULL constraints
  const dummyPassword = require("crypto").randomBytes(32).toString("hex");
  
  await pool.query(
    `INSERT INTO users (id, name, email, avatar_url, role, ${idColumn}, social_provider, password)
     VALUES (?, ?, ?, ?, 'creator', ?, ?, ?)`,
    [userId, name, finalEmail, avatarUrl, providerId, provider, dummyPassword],
  );

  // Auto-create creator profile
  const username =
    (name || "user").toLowerCase().replace(/\s+/g, "_") +
    "_" +
    userId.slice(0, 8);
  await pool.query(
    "INSERT INTO creator_profiles (id, user_id, username) VALUES (UUID(), ?, ?)",
    [userId, username],
  );

  const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [
    userId,
  ]);
  return newUser[0];
}

// ─── Google Strategy ─────────────────────────────────────────────────────────
console.log(process.env.GOOGLE_CLIENT_ID);
console.log(process.env.GOOGLE_CLIENT_SECRET);
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

// ─── Facebook Strategy ───────────────────────────────────────────────────────
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${BACKEND_URL}/api/auth/facebook/callback`,
      profileFields: ["id", "displayName", "emails", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value;
        const user = await findOrCreateOAuthUser({
          provider: "facebook",
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
