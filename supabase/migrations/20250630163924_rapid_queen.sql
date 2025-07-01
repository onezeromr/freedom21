/*
  # Create scenarios table

  1. New Tables
    - `scenarios`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - Investment parameters (starting_amount, monthly_amount, etc.)
      - Calculated results (future_value, btc_hurdle_value, etc.)
      - Advanced strategy options
      - Sharing settings (is_public, shared_with)
      - Timestamps

  2. Security
    - Enable RLS on `scenarios` table
    - Add policies for CRUD operations
    - Add policy for shared scenarios access
*/

CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  
  -- Investment parameters
  starting_amount numeric DEFAULT 0,
  monthly_amount numeric NOT NULL,
  years integer NOT NULL,
  current_age integer,
  btc_hurdle_rate numeric NOT NULL,
  asset text NOT NULL,
  cagr numeric NOT NULL,
  
  -- Advanced strategy options
  pause_after_years integer,
  boost_after_years integer,
  boost_amount numeric,
  use_realistic_cagr boolean DEFAULT false,
  use_declining_rates boolean DEFAULT false,
  phase1_rate numeric,
  phase2_rate numeric,
  phase3_rate numeric,
  inflation_rate numeric,
  use_inflation_adjustment boolean DEFAULT false,
  
  -- Calculated results
  future_value numeric NOT NULL,
  btc_hurdle_value numeric NOT NULL,
  outperformance numeric NOT NULL,
  target_year integer NOT NULL,
  future_age integer,
  
  -- Sharing settings
  is_public boolean DEFAULT false,
  shared_with text[], -- Array of email addresses
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Users can perform all operations on their own scenarios
CREATE POLICY "Users can manage own scenarios"
  ON scenarios
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can read public scenarios
CREATE POLICY "Users can read public scenarios"
  ON scenarios
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Users can read scenarios shared with them
CREATE POLICY "Users can read shared scenarios"
  ON scenarios
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = ANY(shared_with)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();