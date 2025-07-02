/*
  # Create market_data_cache table

  1. New Tables
    - `market_data_cache`
      - `id` (uuid, primary key)
      - `symbol` (text, unique, not null) - Asset symbol (e.g., BTC/USD, SPY)
      - `asset_type` (text, not null) - Type of asset (stock or crypto)
      - `current_price` (numeric, not null) - Current price of the asset
      - `cagr_1y` (numeric, nullable) - 1-year compound annual growth rate
      - `cagr_5y` (numeric, nullable) - 5-year compound annual growth rate
      - `cagr_10y` (numeric, nullable) - 10-year compound annual growth rate
      - `yearly_data` (jsonb, nullable) - Historical yearly price data
      - `last_updated` (timestamptz, default now()) - When the data was last updated
      - `created_at` (timestamptz, default now()) - When the record was created

  2. Security
    - Enable RLS on `market_data_cache` table
    - Add policy for public read access to market data
    - Add policy for anonymous system updates
    - Add policy for authenticated admin users to manage data

  3. Indexes
    - Primary key on `id`
    - Unique index on `symbol`
    - Index on `asset_type` for filtering
    - Index on `last_updated` for cache expiration queries

  4. Constraints
    - Check constraint to ensure asset_type is either 'stock' or 'crypto'
    - Unique constraint on symbol to prevent duplicates
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

-- Add check constraint for asset_type
ALTER TABLE public.market_data_cache 
ADD CONSTRAINT market_data_cache_asset_type_check 
CHECK (asset_type = ANY (ARRAY['stock'::text, 'crypto'::text]));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_cache_symbol ON public.market_data_cache USING btree (symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_asset_type ON public.market_data_cache USING btree (asset_type);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_last_updated ON public.market_data_cache USING btree (last_updated);

-- Enable Row Level Security
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

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