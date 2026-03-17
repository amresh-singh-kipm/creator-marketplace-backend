-- =====================================================
-- COLLABORATION SYSTEM MIGRATION
-- Run this against your existing creator_marketplace DB
-- =====================================================

ALTER TABLE creator_profiles
  ADD COLUMN collaboration_rating DECIMAL(3,2) DEFAULT 0.00;

-- 1. collaborations
CREATE TABLE IF NOT EXISTS collaborations (
  id                   VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  creator_id           VARCHAR(36) NOT NULL,
  title                VARCHAR(300) NOT NULL,
  description          TEXT,
  platform             VARCHAR(50),
  category             VARCHAR(100),
  location             VARCHAR(100),
  followers_required   INT DEFAULT 0,
  collaboration_type   VARCHAR(100),
  status               ENUM('open','in_progress','completed','cancelled') DEFAULT 'open',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
);

-- 2. collaboration_requests
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  collaboration_id  VARCHAR(36) NOT NULL,
  creator_id        VARCHAR(36) NOT NULL,
  status            ENUM('pending','accepted','rejected') DEFAULT 'pending',
  message           TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_request (collaboration_id, creator_id)
);

-- 3. collaboration_participants
CREATE TABLE IF NOT EXISTS collaboration_participants (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  collaboration_id  VARCHAR(36) NOT NULL,
  creator_id        VARCHAR(36) NOT NULL,
  role              VARCHAR(100) DEFAULT 'collaborator',
  joined_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_participant (collaboration_id, creator_id)
);

-- 4. collaboration_reviews
CREATE TABLE IF NOT EXISTS collaboration_reviews (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  collaboration_id  VARCHAR(36) NOT NULL,
  reviewer_id       VARCHAR(36) NOT NULL,
  creator_id        VARCHAR(36) NOT NULL,
  rating            INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES creator_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_collab_review (collaboration_id, reviewer_id, creator_id)
);

-- Indexes
CREATE INDEX idx_collabs_creator ON collaborations(creator_id);
CREATE INDEX idx_collabs_status ON collaborations(status);
CREATE INDEX idx_collab_req_collab ON collaboration_requests(collaboration_id);
CREATE INDEX idx_collab_req_creator ON collaboration_requests(creator_id);
CREATE INDEX idx_collab_part_collab ON collaboration_participants(collaboration_id);

-- Trigger: auto-update collaboration_rating after review insert
DELIMITER //
CREATE TRIGGER trg_update_collab_rating
AFTER INSERT ON collaboration_reviews
FOR EACH ROW
BEGIN
  UPDATE creator_profiles
  SET collaboration_rating = (
    SELECT ROUND(AVG(rating), 2)
    FROM collaboration_reviews
    WHERE creator_id = NEW.creator_id
  )
  WHERE id = NEW.creator_id;
END //
DELIMITER ;
