/*
  # Fix market data cache RLS policies

  1. Security Updates
    - Add policy for authenticated users to insert market data cache entries
    - Add policy for authenticated users to update market data cache entries
    - Ensure anonymous users can also contribute to cache for better performance

  2. Changes
    - Allow INSERT operations for both authenticated and anonymous users
    - Allow UPDATE operations for both authenticated and anonymous users
    - Maintain existing admin and system policies
*/

-- Allow authenticated users to insert market data cache entries
CREATE POLICY "Authenticated users can insert market data cache"
  ON market_data_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update market data cache entries
CREATE POLICY "Authenticated users can update market data cache"
  ON market_data_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert market data cache entries (for better caching performance)
CREATE POLICY "Anonymous users can insert market data cache"
  ON market_data_cache
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update market data cache entries (for better caching performance)
CREATE POLICY "Anonymous users can update market data cache"
  ON market_data_cache
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);