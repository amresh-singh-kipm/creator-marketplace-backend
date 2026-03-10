-- Social Login Migration
-- Run against creator_marketplace DB

ALTER TABLE users
  ADD COLUMN google_id VARCHAR(255) NULL,
  ADD COLUMN github_id VARCHAR(255) NULL,
  ADD COLUMN social_provider VARCHAR(50) NULL;

CREATE UNIQUE INDEX idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX idx_users_github_id ON users(github_id);
