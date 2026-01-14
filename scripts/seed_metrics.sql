-- Seed Dummy Metrics Data (Fixed for SQL Editor)
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- 1. Get the first user from the auth.users table
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users. Please sign up in the app first.';
  END IF;

  RAISE NOTICE 'Seeding data for User ID: %', target_user_id;

  -- 2. Create dummy members (linked to this user)
  INSERT INTO members (email, status, user_id)
  VALUES 
    ('test_user_1@example.com', 'Day 5: Sent', target_user_id),
    ('test_user_2@example.com', 'Refunded', target_user_id),
    ('test_user_3@example.com', 'Day 3: Sent', target_user_id)
  ON CONFLICT (email) DO NOTHING;

  -- 3. Insert Events for Metrics
  
  -- Sequence Starts (5 users started)
  INSERT INTO member_events (user_id, member_email, event_type, event_data, created_at)
  VALUES
    (target_user_id, 'user1@test.com', 'sequence_started', '{"sequence_length": 5}', now() - interval '5 days'),
    (target_user_id, 'user2@test.com', 'sequence_started', '{"sequence_length": 5}', now() - interval '4 days'),
    (target_user_id, 'user3@test.com', 'sequence_started', '{"sequence_length": 5}', now() - interval '3 days'),
    (target_user_id, 'user4@test.com', 'sequence_started', '{"sequence_length": 5}', now() - interval '2 days'),
    (target_user_id, 'user5@test.com', 'sequence_started', '{"sequence_length": 5}', now() - interval '1 day');

  -- Sequence Completions (3 users finished = 60% completion rate)
  INSERT INTO member_events (user_id, member_email, event_type, event_data, created_at)
  VALUES
    (target_user_id, 'user1@test.com', 'sequence_completed', '{"total_days": 5}', now()),
    (target_user_id, 'user2@test.com', 'sequence_completed', '{"total_days": 5}', now()),
    (target_user_id, 'user3@test.com', 'sequence_completed', '{"total_days": 5}', now());

  -- Refunds (1 user refunded = 20% refund rate)
  INSERT INTO member_events (user_id, member_email, event_type, event_data, created_at)
  VALUES
    (target_user_id, 'user5@test.com', 'refund', '{"amount": 9900, "reason": "requested"}', now());

  -- Email Sends (with latency data)
  INSERT INTO member_events (user_id, member_email, event_type, event_data, created_at)
  VALUES
    (target_user_id, 'user1@test.com', 'email_sent', '{"latency_ms": 250, "day": 1}', now() - interval '5 days'),
    (target_user_id, 'user2@test.com', 'email_sent', '{"latency_ms": 800, "day": 1}', now() - interval '4 days'),
    (target_user_id, 'user3@test.com', 'email_sent', '{"latency_ms": 350, "day": 1}', now() - interval '3 days');

END $$;
