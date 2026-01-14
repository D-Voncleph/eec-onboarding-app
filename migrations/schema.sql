-- Complete Database Schema for EEC Onboarding App
-- Run this first to create all tables, then run migration_whop_users.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sequences Table - stores email sequences per user
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  whop_user_id TEXT,
  title TEXT NOT NULL DEFAULT 'New Sequence',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Members Table - stores members going through onboarding
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whop_user_id TEXT UNIQUE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_day INTEGER DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Member Events Table - tracks member activity
CREATE TABLE IF NOT EXISTS member_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  whop_user_id TEXT,
  event_type TEXT NOT NULL,
  day INTEGER,
  email_sent BOOLEAN DEFAULT FALSE,
  email_opened BOOLEAN DEFAULT FALSE,
  email_clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  whop_user_id TEXT UNIQUE,
  theme TEXT DEFAULT 'midnight_blue',
  notifications JSONB DEFAULT '{"email": true, "webhook": true}'::jsonb,
  default_sequence_id UUID REFERENCES sequences(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Logs Table - tracks sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  whop_user_id TEXT,
  day INTEGER NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sequences_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_whop ON sequences(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_whop ON members(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_events_member ON member_events(member_id);
CREATE INDEX IF NOT EXISTS idx_events_whop ON member_events(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON member_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_member ON email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at);

-- Enable Row Level Security
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (allow authenticated users access)
CREATE POLICY "Allow authenticated access" ON sequences
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access" ON members
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access" ON member_events
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access" ON user_preferences
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access" ON email_logs
  FOR ALL TO authenticated USING (true);

SELECT 'Schema created successfully' as status;
