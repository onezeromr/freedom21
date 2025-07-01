/*
  # Create portfolio entries table

  1. New Tables
    - `portfolio_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `amount` (numeric) - Portfolio amount entered by user
      - `variance` (numeric) - Difference from target
      - `variance_percentage` (numeric) - Percentage variance from target
      - `target` (numeric) - Target value at time of entry
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `portfolio_entries` table
    - Add policies for users to manage their own entries
*/

CREATE TABLE IF NOT EXISTS portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  variance numeric NOT NULL,
  variance_percentage numeric NOT NULL,
  target numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own portfolio entries
CREATE POLICY "Users can manage own portfolio entries"
  ON portfolio_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_user_id ON portfolio_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_created_at ON portfolio_entries(created_at);