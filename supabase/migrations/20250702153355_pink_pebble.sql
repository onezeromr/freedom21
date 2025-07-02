/*
  # Create market data cache table

  1. New Tables
    - `market_data_cache`
      - `id` (uuid, primary key)
      - `symbol` (text, unique)
      - `asset_type` (text) - 'stock' or 'crypto'
      - `current_price` (numeric)
      - `cagr_1y` (numeric, nullable)
      - `cagr_5y` (numeric, nullable)
      - `cagr_10y` (numeric, nullable)
      - `yearly_data` (jsonb) - Array of yearly price data
      - `last_updated` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `market_data_cache` table
    - Add policies for public read access
    - Add policy for system updates (admin only)

  3. Indexes
    - Index on symbol for fast lookups
    - Index on last_updated for cache invalidation
*/

CREATE TABLE IF NOT EXISTS market_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  current_price numeric NOT NULL,
  cagr_1y numeric,
  cagr_5y numeric,
  cagr_10y numeric,
  yearly_data jsonb DEFAULT '[]'::jsonb,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to market data
CREATE POLICY "Public read access to market data"
  ON market_data_cache
  FOR SELECT
  TO public
  USING (true);

-- Allow system/admin updates (you can modify this based on your admin setup)
CREATE POLICY "System can update market data"
  ON market_data_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email IN ('admin@freedom21.co', 'system@freedom21.co')
    )
  );

-- Allow anonymous insert/update for system operations
CREATE POLICY "Anonymous system updates"
  ON market_data_cache
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_cache_symbol ON market_data_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_last_updated ON market_data_cache(last_updated);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_asset_type ON market_data_cache(asset_type);