-- Add unique constraint to members table
-- This is required for "ON CONFLICT (email)" to work in the seed script and backend API.

-- First, we attempt to remove duplicates if any exist (keeping the latest one)
-- This is a safety measure to ensure the constraint can be applied.
DELETE FROM members a USING members b
WHERE a.id < b.id AND a.email = b.email;

-- Now add the unique constraint
ALTER TABLE members 
ADD CONSTRAINT members_email_key UNIQUE (email);
