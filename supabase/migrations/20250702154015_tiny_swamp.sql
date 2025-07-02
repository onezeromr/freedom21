/*
  # Create market data cache table

  1. New Tables
    - `market_data_cache`
      - `id` (uuid, primary key)
      - `symbol` (text, unique)
      - `asset_type` (text with check constraint)
      - `current_price` (numeric)
      - `cagr_1y` (numeric, nullable)
      - `cagr_5y` (numeric, nullable)
      - `cagr_10y` (numeric, nullable)
      - `yearly_data` (jsonb array)
      - `last_updated` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `market_data_cache` table
    - Add policies for public read access
    - Add policies for system updates
    - Add policy for admin updates

  3. Performance
    - Add indexes for symbol, asset_type, and last_updated
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

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Public read access to market data" ON public.market_data_cache;
  DROP POLICY IF EXISTS "Anonymous system updates" ON public.market_data_cache;
  DROP POLICY IF EXISTS "System can update market data" ON public.market_data_cache;
  
  -- Create policies for data access
  CREATE POLICY "Public read access to market data"
    ON public.market_data_cache
    FOR SELECT
    TO public
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
END $$;