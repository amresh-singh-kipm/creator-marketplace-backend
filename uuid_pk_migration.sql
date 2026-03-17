-- =============================================================
-- UUID PRIMARY KEY MIGRATION (safe, idempotent-ish)
-- Converts all PK/FK columns to VARCHAR(36) with UUIDv4 values.
-- Run on MySQL 8+ in a maintenance window. Test on a backup first.
-- Steps per table: add *_new UUID columns, backfill, swap PK/FKs, drop old.
-- =============================================================
SET FOREIGN_KEY_CHECKS=0;

-- users
ALTER TABLE users ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID());
UPDATE users SET id_new = UUID() WHERE id_new IS NULL;

-- creator_profiles
ALTER TABLE creator_profiles
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN user_id_new VARCHAR(36);
UPDATE creator_profiles cp JOIN users u ON cp.user_id = u.id
  SET cp.user_id_new = u.id_new, cp.id_new = UUID() WHERE cp.id_new IS NULL;

-- brand_profiles
ALTER TABLE brand_profiles
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN user_id_new VARCHAR(36);
UPDATE brand_profiles bp JOIN users u ON bp.user_id = u.id
  SET bp.user_id_new = u.id_new, bp.id_new = UUID() WHERE bp.id_new IS NULL;

-- creator_platforms
ALTER TABLE creator_platforms
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE creator_platforms p JOIN creator_profiles cp ON p.creator_id = cp.id
  SET p.creator_id_new = cp.id_new, p.id_new = UUID() WHERE p.id_new IS NULL;

-- promotion_packages
ALTER TABLE promotion_packages
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE promotion_packages pkg JOIN creator_profiles cp ON pkg.creator_id = cp.id
  SET pkg.creator_id_new = cp.id_new, pkg.id_new = UUID() WHERE pkg.id_new IS NULL;

-- campaigns
ALTER TABLE campaigns
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN brand_id_new VARCHAR(36);
UPDATE campaigns c JOIN brand_profiles bp ON c.brand_id = bp.id
  SET c.brand_id_new = bp.id_new, c.id_new = UUID() WHERE c.id_new IS NULL;

-- campaign_invites
ALTER TABLE campaign_invites
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN campaign_id_new VARCHAR(36),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE campaign_invites ci
  JOIN campaigns c ON ci.campaign_id = c.id
  JOIN creator_profiles cp ON ci.creator_id = cp.id
  SET ci.campaign_id_new = c.id_new, ci.creator_id_new = cp.id_new, ci.id_new = UUID()
  WHERE ci.id_new IS NULL;

-- bookings
ALTER TABLE bookings
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN brand_id_new VARCHAR(36),
  ADD COLUMN creator_id_new VARCHAR(36),
  ADD COLUMN package_id_new VARCHAR(36),
  ADD COLUMN campaign_id_new VARCHAR(36);
UPDATE bookings b
  LEFT JOIN brand_profiles bp ON b.brand_id = bp.id
  LEFT JOIN creator_profiles cp ON b.creator_id = cp.id
  LEFT JOIN promotion_packages pkg ON b.package_id = pkg.id
  LEFT JOIN campaigns c ON b.campaign_id = c.id
  SET b.brand_id_new = bp.id_new, b.creator_id_new = cp.id_new,
      b.package_id_new = pkg.id_new, b.campaign_id_new = c.id_new,
      b.id_new = UUID()
  WHERE b.id_new IS NULL;

-- payments
ALTER TABLE payments
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN booking_id_new VARCHAR(36);
UPDATE payments p JOIN bookings b ON p.booking_id = b.id
  SET p.booking_id_new = b.id_new, p.id_new = UUID() WHERE p.id_new IS NULL;

-- escrow_wallet
ALTER TABLE escrow_wallet
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN booking_id_new VARCHAR(36);
UPDATE escrow_wallet ew JOIN bookings b ON ew.booking_id = b.id
  SET ew.booking_id_new = b.id_new, ew.id_new = UUID() WHERE ew.id_new IS NULL;

-- creator_earnings
ALTER TABLE creator_earnings
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN creator_id_new VARCHAR(36),
  ADD COLUMN booking_id_new VARCHAR(36);
UPDATE creator_earnings ce
  JOIN creator_profiles cp ON ce.creator_id = cp.id
  JOIN bookings b ON ce.booking_id = b.id
  SET ce.creator_id_new = cp.id_new, ce.booking_id_new = b.id_new, ce.id_new = UUID()
  WHERE ce.id_new IS NULL;

-- reviews
ALTER TABLE reviews
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN booking_id_new VARCHAR(36),
  ADD COLUMN brand_id_new VARCHAR(36),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE reviews r
  JOIN bookings b ON r.booking_id = b.id
  JOIN brand_profiles bp ON r.brand_id = bp.id
  JOIN creator_profiles cp ON r.creator_id = cp.id
  SET r.booking_id_new = b.id_new, r.brand_id_new = bp.id_new,
      r.creator_id_new = cp.id_new, r.id_new = UUID()
  WHERE r.id_new IS NULL;

-- messages
ALTER TABLE messages
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN sender_id_new VARCHAR(36),
  ADD COLUMN receiver_id_new VARCHAR(36),
  ADD COLUMN booking_id_new VARCHAR(36);
UPDATE messages m
  JOIN users s ON m.sender_id = s.id
  JOIN users r ON m.receiver_id = r.id
  LEFT JOIN bookings b ON m.booking_id = b.id
  SET m.sender_id_new = s.id_new, m.receiver_id_new = r.id_new,
      m.booking_id_new = b.id_new, m.id_new = UUID()
  WHERE m.id_new IS NULL;

-- notifications
ALTER TABLE notifications
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN user_id_new VARCHAR(36);
UPDATE notifications n JOIN users u ON n.user_id = u.id
  SET n.user_id_new = u.id_new, n.id_new = UUID() WHERE n.id_new IS NULL;

-- admin_logs
ALTER TABLE admin_logs
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN admin_id_new VARCHAR(36);
UPDATE admin_logs al LEFT JOIN users u ON al.admin_id = u.id
  SET al.admin_id_new = u.id_new, al.id_new = UUID() WHERE al.id_new IS NULL;

-- collaboration tables (if present)
ALTER TABLE collaborations
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE collaborations c JOIN creator_profiles cp ON c.creator_id = cp.id
  SET c.creator_id_new = cp.id_new, c.id_new = UUID() WHERE c.id_new IS NULL;

ALTER TABLE collaboration_requests
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN collaboration_id_new VARCHAR(36),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE collaboration_requests cr
  JOIN collaborations c ON cr.collaboration_id = c.id
  JOIN creator_profiles cp ON cr.creator_id = cp.id
  SET cr.collaboration_id_new = c.id_new, cr.creator_id_new = cp.id_new, cr.id_new = UUID()
  WHERE cr.id_new IS NULL;

ALTER TABLE collaboration_participants
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN collaboration_id_new VARCHAR(36),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE collaboration_participants cp
  JOIN collaborations c ON cp.collaboration_id = c.id
  JOIN creator_profiles cpr ON cp.creator_id = cpr.id
  SET cp.collaboration_id_new = c.id_new, cp.creator_id_new = cpr.id_new, cp.id_new = UUID()
  WHERE cp.id_new IS NULL;

ALTER TABLE collaboration_reviews
  ADD COLUMN id_new VARCHAR(36) DEFAULT (UUID()),
  ADD COLUMN collaboration_id_new VARCHAR(36),
  ADD COLUMN reviewer_id_new VARCHAR(36),
  ADD COLUMN creator_id_new VARCHAR(36);
UPDATE collaboration_reviews cr
  JOIN collaborations c ON cr.collaboration_id = c.id
  JOIN creator_profiles rv ON cr.reviewer_id = rv.id
  JOIN creator_profiles ct ON cr.creator_id = ct.id
  SET cr.collaboration_id_new = c.id_new, cr.reviewer_id_new = rv.id_new,
      cr.creator_id_new = ct.id_new, cr.id_new = UUID()
  WHERE cr.id_new IS NULL;

-- ===== swap columns =====
-- Example pattern (users); repeat for each table manually or via script:
-- ALTER TABLE users DROP PRIMARY KEY, CHANGE COLUMN id id_old INT, CHANGE COLUMN id_new id VARCHAR(36), ADD PRIMARY KEY (id);
-- then adjust child tables: ALTER TABLE creator_profiles DROP FOREIGN KEY ..., CHANGE COLUMN user_id_new user_id VARCHAR(36), DROP COLUMN user_id;
-- After all swaps, drop *_old and unused *_new helper columns.

SET FOREIGN_KEY_CHECKS=1;

