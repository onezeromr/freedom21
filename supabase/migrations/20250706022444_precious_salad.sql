/*
  # Market Data Cache Table

  1. New Tables
    - `market_data_cache`
      - `id` (uuid, primary key)
      - `symbol` (text, unique, not null)
      - `asset_type` (text, not null, check constraint for 'stock' or 'crypto')
      - `current_price` (numeric, not null)
      - `cagr_1y` (numeric, nullable)
      - `cagr_5y` (numeric, nullable)
      - `cagr_10y` (numeric, nullable)
      - `yearly_data` (jsonb, default empty array)
      - `last_updated` (timestamptz, default now)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `market_data_cache` table
    - Add policy for public read access
    - Add policy for anonymous system updates
    - Add policy for authenticated admin updates

  3. Performance
    - Add indexes on symbol, asset_type, and last_updated columns
*/

-- Create the market_data_cache table
CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  asset_type text NOT NULL,
  current_price numeric NOT NULL,
  cagr_1y numeric,
  cagr_5y numeric,
  cagr_10y numeric,
  yearly_data jsonb DEFAULT '[]'::jsonb,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add check constraint for asset_type only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'market_data_cache_asset_type_check' 
    AND table_name = 'market_data_cache'
  ) THEN
    ALTER TABLE public.market_data_cache 
    ADD CONSTRAINT market_data_cache_asset_type_check 
    CHECK (asset_type = ANY (ARRAY['stock'::text, 'crypto'::text]));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_cache_symbol ON public.market_data_cache USING btree (symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_asset_type ON public.market_data_cache USING btree (asset_type);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_last_updated ON public.market_data_cache USING btree (last_updated);

-- Enable Row Level Security
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for data access (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Public read access to market data" ON public.market_data_cache;
DROP POLICY IF EXISTS "Anonymous system updates" ON public.market_data_cache;
DROP POLICY IF EXISTS "System can update market data" ON public.market_data_cache;
DROP POLICY IF EXISTS "Anonymous users can insert market data cache" ON public.market_data_cache;
DROP POLICY IF EXISTS "Anonymous users can update market data cache" ON public.market_data_cache;
DROP POLICY IF EXISTS "Authenticated users can insert market data cache" ON public.market_data_cache;
DROP POLICY IF EXISTS "Authenticated users can update market data cache" ON public.market_data_cache;

-- Create new policies
CREATE POLICY "Public read access to market data"
  ON public.market_data_cache
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anonymous users can insert market data cache"
  ON public.market_data_cache
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update market data cache"
  ON public.market_data_cache
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can insert market data cache"
  ON public.market_data_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update market data cache"
  ON public.market_data_cache
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anonymous system updates"
  ON public.market_data_cache
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can update market data"
  ON public.market_data_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = ANY(ARRAY['admin@freedom21.co', 'system@freedom21.co'])
    )
  );