-- =============================================
-- UUID Migration for all tables
-- Adds a uuid VARCHAR(36) UNIQUE column to every table
-- Existing integer PKs remain as internal FKs
-- =============================================

-- users (already done, but safe to re-run with IF NOT EXISTS workaround via ALTER IGNORE)
ALTER TABLE users MODIFY COLUMN uuid VARCHAR(36) NOT NULL DEFAULT '';
UPDATE users SET uuid = UUID() WHERE uuid = '' OR uuid IS NULL;

-- bookings
ALTER TABLE bookings ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE bookings SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE bookings MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_bookings_uuid (uuid);

-- brand_profiles
ALTER TABLE brand_profiles ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE brand_profiles SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE brand_profiles MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_brand_uuid (uuid);

-- creator_profiles
ALTER TABLE creator_profiles ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE creator_profiles SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE creator_profiles MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_creator_uuid (uuid);

-- campaigns
ALTER TABLE campaigns ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE campaigns SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE campaigns MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_campaigns_uuid (uuid);

-- campaign_invites
ALTER TABLE campaign_invites ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE campaign_invites SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE campaign_invites MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_campaign_invites_uuid (uuid);

-- payments
ALTER TABLE payments ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE payments SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE payments MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_payments_uuid (uuid);

-- promotion_packages
ALTER TABLE promotion_packages ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE promotion_packages SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE promotion_packages MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_packages_uuid (uuid);

-- messages
ALTER TABLE messages ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE messages SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE messages MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_messages_uuid (uuid);

-- notifications
ALTER TABLE notifications ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE notifications SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE notifications MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_notifications_uuid (uuid);

-- reviews
ALTER TABLE reviews ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE reviews SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE reviews MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_reviews_uuid (uuid);

-- escrow_wallet
ALTER TABLE escrow_wallet ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE escrow_wallet SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE escrow_wallet MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_escrow_uuid (uuid);

-- creator_earnings
ALTER TABLE creator_earnings ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE creator_earnings SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE creator_earnings MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_earnings_uuid (uuid);

-- creator_platforms
ALTER TABLE creator_platforms ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE creator_platforms SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE creator_platforms MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_platforms_uuid (uuid);

-- collaborations
ALTER TABLE collaborations ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE collaborations SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE collaborations MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_collaborations_uuid (uuid);

-- collaboration_requests
ALTER TABLE collaboration_requests ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE collaboration_requests SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE collaboration_requests MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_collab_req_uuid (uuid);

-- collaboration_participants
ALTER TABLE collaboration_participants ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE collaboration_participants SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE collaboration_participants MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_collab_part_uuid (uuid);

-- collaboration_reviews
ALTER TABLE collaboration_reviews ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE collaboration_reviews SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE collaboration_reviews MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_collab_rev_uuid (uuid);

-- admin_logs
ALTER TABLE admin_logs ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;
UPDATE admin_logs SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE admin_logs MODIFY COLUMN uuid VARCHAR(36) NOT NULL, ADD UNIQUE KEY uniq_admin_logs_uuid (uuid);
