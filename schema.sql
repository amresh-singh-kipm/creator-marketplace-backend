-- =====================================================
-- CREATOR MARKETPLACE - MySQL Schema
-- =====================================================

-- Drop tables in reverse FK order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS creator_earnings;
DROP TABLE IF EXISTS escrow_wallet;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS campaign_invites;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS promotion_packages;
DROP TABLE IF EXISTS creator_platforms;
DROP TABLE IF EXISTS brand_profiles;
DROP TABLE IF EXISTS creator_profiles;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. users
CREATE TABLE users (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('creator', 'brand', 'admin') NOT NULL,
  avatar_url  VARCHAR(500),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. creator_profiles
CREATE TABLE creator_profiles (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36) UNIQUE,
  username    VARCHAR(100) UNIQUE NOT NULL,
  bio         TEXT,
  category    VARCHAR(100),
  city        VARCHAR(100),
  country     VARCHAR(100),
  verified    TINYINT(1) DEFAULT 0,
  rating      DECIMAL(3,2) DEFAULT 0.00,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. brand_profiles
CREATE TABLE brand_profiles (
  id           VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id      VARCHAR(36) UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  industry     VARCHAR(100),
  website      VARCHAR(300),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. creator_platforms
CREATE TABLE creator_platforms (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  creator_id      VARCHAR(36),
  platform_name   VARCHAR(50) NOT NULL,
  username        VARCHAR(150),
  profile_url     VARCHAR(500),
  followers       INT DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0.00,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
);

-- 5. promotion_packages
CREATE TABLE promotion_packages (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  creator_id    VARCHAR(36),
  package_name  VARCHAR(200) NOT NULL,
  description   TEXT,
  price         DECIMAL(12,2) NOT NULL,
  delivery_days INT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
);

-- 6. campaigns
CREATE TABLE campaigns (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  brand_id    VARCHAR(36),
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  budget      DECIMAL(12,2),
  category    VARCHAR(100),
  status      ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brand_profiles(id) ON DELETE CASCADE
);

-- 7. campaign_invites
CREATE TABLE campaign_invites (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  campaign_id VARCHAR(36),
  creator_id  VARCHAR(36),
  status      ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
);

-- 8. bookings
CREATE TABLE bookings (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  brand_id    VARCHAR(36),
  creator_id  VARCHAR(36),
  package_id  VARCHAR(36),
  campaign_id VARCHAR(36),
  status      ENUM('pending','accepted','content_submitted','content_rejected','completed','cancelled') DEFAULT 'pending',
  price       DECIMAL(12,2) NOT NULL,
  notes       TEXT,
  content_url      VARCHAR(500),
  content_type     VARCHAR(50),
  content_note     TEXT,
  rejection_reason TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brand_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES promotion_packages(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

-- 9. payments
CREATE TABLE payments (
  id                   VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id           VARCHAR(36),
  razorpay_order_id    VARCHAR(200),
  razorpay_payment_id  VARCHAR(200),
  amount               DECIMAL(12,2) NOT NULL,
  payment_status       ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 10. escrow_wallet
CREATE TABLE escrow_wallet (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id  VARCHAR(36) UNIQUE,
  amount      DECIMAL(12,2) NOT NULL,
  status      ENUM('held', 'released', 'refunded') DEFAULT 'held',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 11. creator_earnings
CREATE TABLE creator_earnings (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  creator_id  VARCHAR(36),
  booking_id  VARCHAR(36),
  amount      DECIMAL(12,2) NOT NULL,
  status      ENUM('pending', 'paid') DEFAULT 'pending',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 12. withdrawals
CREATE TABLE withdrawals (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  creator_id  VARCHAR(36) NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  status      ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
  details     JSON,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
);

-- 13. reviews
CREATE TABLE reviews (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id  VARCHAR(36) UNIQUE,
  brand_id    VARCHAR(36),
  creator_id  VARCHAR(36),
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brand_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
);

-- 13. messages
CREATE TABLE messages (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sender_id   VARCHAR(36),
  receiver_id VARCHAR(36),
  booking_id  VARCHAR(36),
  message     TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- 14. collaboration_messages
CREATE TABLE collaboration_messages (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  collaboration_id VARCHAR(36) NOT NULL,
  sender_id        VARCHAR(36) NOT NULL,
  message          TEXT NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. notifications
CREATE TABLE notifications (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36),
  message     TEXT NOT NULL,
  read_status TINYINT(1) DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. admin_logs
CREATE TABLE admin_logs (
  id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  action     TEXT NOT NULL,
  admin_id   VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_bookings_brand ON bookings(brand_id);
CREATE INDEX idx_bookings_creator ON bookings(creator_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_creator_platforms_creator ON creator_platforms(creator_id);
CREATE INDEX idx_packages_creator ON promotion_packages(creator_id);

-- =============================================
-- AUTO-UPDATE CREATOR RATING TRIGGER (MySQL)
-- =============================================
DELIMITER //

CREATE TRIGGER trg_update_creator_rating
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE creator_profiles
  SET rating = (
    SELECT ROUND(AVG(rating), 2)
    FROM reviews
    WHERE creator_id = NEW.creator_id
  )
  WHERE id = NEW.creator_id;
END //

CREATE TRIGGER trg_update_creator_rating_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  UPDATE creator_profiles
  SET rating = (
    SELECT ROUND(AVG(rating), 2)
    FROM reviews
    WHERE creator_id = NEW.creator_id
  )
  WHERE id = NEW.creator_id;
END //

DELIMITER ;
