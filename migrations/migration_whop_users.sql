-- Migration: Add WHOP User ID Support (for fresh schema)
-- Run this AFTER schema.sql

-- 1. Add whop_user_id column to sequences table
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS whop_user_id TEXT;

-- 2. Add whop_user_id column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

-- 3. Add whop_user_id column to member_events table
ALTER TABLE member_events ADD COLUMN IF NOT EXISTS whop_user_id TEXT;

-- 4. Add whop_user_id column to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

-- 5. Create unique index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sequences_whop_user ON sequences(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_members_whop_user ON members(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_events_whop_user ON member_events(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_whop_user ON user_preferences(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_whop ON email_logs(whop_user_id);

SELECT 'WHOP migration completed successfully' as status;
