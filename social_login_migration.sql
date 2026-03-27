-- Social Login Migration
-- Run against creator_marketplace DB

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS social_provider VARCHAR(50) NULL;

-- Create indexes only if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
