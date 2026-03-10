const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Helper: issue JWT and redirect to frontend callback page
function issueTokenAndRedirect(req, res) {
  const user = req.user;
  if (!user) {
    return res.redirect(`${FRONTEND_URL}/oauth/callback?error=auth_failed`);
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
  };
  const encoded = encodeURIComponent(JSON.stringify(safeUser));
  return res.redirect(
    `${FRONTEND_URL}/oauth/callback?token=${token}&user=${encoded}`,
  );
}

// ─── Google ───────────────────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: true,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login?error=google_failed`,
    session: true,
  }),
  issueTokenAndRedirect,
);

// ─── GitHub ───────────────────────────────────────────────────────────────────
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: true }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${FRONTEND_URL}/login?error=github_failed`,
    session: true,
  }),
  issueTokenAndRedirect,
);

module.exports = router;
