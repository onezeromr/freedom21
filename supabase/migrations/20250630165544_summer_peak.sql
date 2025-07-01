/*
  # Create analytics events table with proper policy handling

  1. New Tables
    - `analytics_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable, references profiles)
      - `event_type` (text)
      - `event_data` (jsonb)
      - `session_id` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `analytics_events` table
    - Add policies for event creation and reading (with existence checks)
    - Allow anonymous event tracking
*/

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can create analytics events" ON analytics_events;
  DROP POLICY IF EXISTS "Anonymous users can create analytics events" ON analytics_events;
  DROP POLICY IF EXISTS "Users can read own analytics events" ON analytics_events;
  DROP POLICY IF EXISTS "Admin users can read all analytics events" ON analytics_events;
  
  -- Create policies
  CREATE POLICY "Users can create analytics events"
    ON analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  CREATE POLICY "Anonymous users can create analytics events"
    ON analytics_events
    FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);

  CREATE POLICY "Users can read own analytics events"
    ON analytics_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Admin users can read all analytics events"
    ON analytics_events
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND email IN ('admin@freedom21.co', 'analytics@freedom21.co')
      )
    );
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);