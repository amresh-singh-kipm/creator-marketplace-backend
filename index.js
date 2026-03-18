require("dotenv").config();
const express = require("express");
const cors = require("cors");
// const session = require("express-session"); // SOCIAL LOGIN (disabled)

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// app.use(
//   cors({
//     origin: [
//       // "http://localhost:5173",
//       // "https://mydigitalassets.store",
//       // "https://api.mydigitalassets.store",
//       "*",
//     ],
//     credentials: true,
//   }),
// );
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  require("express").static(require("path").join(__dirname, "uploads")),
);

app.use("/test", (req, res) => {
  res.json({ message: "Test route" });
});

// app.use("/", (req, res) => {
//   res.json({ message: "Welcome to the Creator Marketplace API" });
// });
// SOCIAL LOGIN — uncomment when OAuth credentials are configured
// app.use(
//   session({
//     secret:
//       process.env.SESSION_SECRET ||
//       process.env.JWT_SECRET ||
//       "session_secret_change_me",
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 5 min — just long enough for OAuth redirect
//   }),
// );

// Passport (OAuth)
// const passport = require("./config/passport");
// app.use(passport.initialize());
// app.use(passport.session());

// Routes
app.use("/api/auth", require("./routes/auth"));
// app.use("/api/auth", require("./routes/oauth")); // Google + GitHub OAuth // SOCIAL LOGIN (disabled)
app.use("/api/creators", require("./routes/creators"));
app.use("/api/campaigns", require("./routes/campaigns"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/withdrawals", require("./routes/withdrawals"));
app.use("/api/collaborations", require("./routes/collaborations"));
app.use("/api/collaboration-reviews", require("./routes/collaborationReviews"));

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
