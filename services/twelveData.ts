import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// For web platform, use localStorage; for mobile, we'll use a simple in-memory cache
const storage = Platform.OS === 'web' ? localStorage : new Map();

const API_KEY = '7d48447a4f9e4e5e854bc233e4118cb7';
const BASE_URL = 'https://api.twelvedata.com';
const CACHE_DURATION = 4.8 * 60 * 60 * 1000; // 4.8 hours (5 times per day)

// Asset mapping for Twelve Data API
const SYMBOL_MAP: Record<string, { symbol: string; type: 'crypto' | 'stock'; exchange?: string }> = {
  'BTC': { symbol: 'BTC/USD', type: 'crypto' },
  'Bitcoin': { symbol: 'BTC/USD', type: 'crypto' },
  'SPX': { symbol: 'SPY', type: 'stock', exchange: 'NYSE' },
  'S&P 500': { symbol: 'SPY', type: 'stock', exchange: 'NYSE' },
  'QQQ': { symbol: 'QQQ', type: 'stock', exchange: 'NASDAQ' },
  'NVDA': { symbol: 'NVDA', type: 'stock', exchange: 'NASDAQ' },
  'NVIDIA': { symbol: 'NVDA', type: 'stock', exchange: 'NASDAQ' },
  'TSLA': { symbol: 'TSLA', type: 'stock', exchange: 'NASDAQ' },
  'Tesla': { symbol: 'TSLA', type: 'stock', exchange: 'NASDAQ' },
  'MSTR': { symbol: 'MSTR', type: 'stock', exchange: 'NASDAQ' },
  'MTPLF': { symbol: 'MTPLF', type: 'stock', exchange: 'OTC' },
  'Metaplanet': { symbol: 'MTPLF', type: 'stock', exchange: 'OTC' }
};

// Fallback CAGR data when API fails or rate limits
const FALLBACK_CAGR: Record<string, CAGRData> = {
  'BTC': { 
    cagr1Y: 150, 
    cagr5Y: 45, 
    cagr10Y: 30,
    currentPrice: 95000,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'Bitcoin': { 
    cagr1Y: 150, 
    cagr5Y: 45, 
    cagr10Y: 30,
    currentPrice: 95000,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'SPX': { 
    cagr1Y: 25, 
    cagr5Y: 14, 
    cagr10Y: 10,
    currentPrice: 450,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'S&P 500': { 
    cagr1Y: 25, 
    cagr5Y: 14, 
    cagr10Y: 10,
    currentPrice: 450,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'QQQ': { 
    cagr1Y: 30, 
    cagr5Y: 18, 
    cagr10Y: 12,
    currentPrice: 400,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'NVDA': { 
    cagr1Y: 200, 
    cagr5Y: 65, 
    cagr10Y: 15,
    currentPrice: 140,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'NVIDIA': { 
    cagr1Y: 200, 
    cagr5Y: 65, 
    cagr10Y: 15,
    currentPrice: 140,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'TSLA': { 
    cagr1Y: 100, 
    cagr5Y: 55, 
    cagr10Y: 15,
    currentPrice: 350,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'Tesla': { 
    cagr1Y: 100, 
    cagr5Y: 55, 
    cagr10Y: 15,
    currentPrice: 350,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'MSTR': { 
    cagr1Y: 180, 
    cagr5Y: 50, 
    cagr10Y: 35,
    currentPrice: 400,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'MTPLF': { 
    cagr1Y: 250, 
    cagr5Y: 80, 
    cagr10Y: 40,
    currentPrice: 15,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  },
  'Metaplanet': { 
    cagr1Y: 250, 
    cagr5Y: 80, 
    cagr10Y: 40,
    currentPrice: 15,
    lastUpdate: new Date().toISOString(),
    yearlyData: []
  }
};

export interface CAGRData {
  currentPrice: number;
  lastUpdate: string;
  cagr1Y: number | 'N/A';
  cagr5Y: number | 'N/A';
  cagr10Y: number | 'N/A';
  yearlyData: Array<{ year: number; price: number }>;
}

export interface CAGRResult {
  data: CAGRData;
  isFallback: boolean;
  errorMessage?: string;
}

interface CachedData {
  data: CAGRData;
  timestamp: number;
}

interface FetchResult {
  success: boolean;
  data?: CAGRData;
  error?: string;
}

// Storage helpers for cross-platform compatibility
const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return storage.get(key) || null;
  }
};

const setStorageItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    storage.set(key, value);
  }
};

// Check Supabase cache first
async function getSupabaseCachedData(symbol: string): Promise<CAGRData | null> {
  try {
    const { data, error } = await supabase
      .from('market_data_cache')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cache is still valid (within CACHE_DURATION)
    const lastUpdated = new Date(data.last_updated).getTime();
    const now = Date.now();
    
    if (now - lastUpdated < CACHE_DURATION) {
      return {
        currentPrice: data.current_price,
        lastUpdate: data.last_updated,
        cagr1Y: data.cagr_1y || 'N/A',
        cagr5Y: data.cagr_5y || 'N/A',
        cagr10Y: data.cagr_10y || 'N/A',
        yearlyData: data.yearly_data || []
      };
    }

    return null;
  } catch (error) {
    console.error('Supabase cache read error:', error);
    return null;
  }
}

// Save to Supabase cache
async function saveToSupabaseCache(symbol: string, assetType: string, data: CAGRData): Promise<void> {
  try {
    const { error } = await supabase
      .from('market_data_cache')
      .upsert({
        symbol,
        asset_type: assetType,
        current_price: data.currentPrice,
        cagr_1y: data.cagr1Y !== 'N/A' ? data.cagr1Y : null,
        cagr_5y: data.cagr5Y !== 'N/A' ? data.cagr5Y : null,
        cagr_10y: data.cagr10Y !== 'N/A' ? data.cagr10Y : null,
        yearly_data: data.yearlyData,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'symbol'
      });

    if (error) {
      console.error('Error saving to Supabase cache:', error);
    } else {
      console.log(`Successfully cached data for ${symbol} in Supabase`);
    }
  } catch (error) {
    console.error('Supabase cache write error:', error);
  }
}

// Check local cache
async function getCachedData(assetKey: string): Promise<CachedData | null> {
  try {
    const cached = await getStorageItem(`cagr_${assetKey}`);
    if (cached) {
      const data: CachedData = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Local cache read error:', error);
  }
  return null;
}

// Calculate CAGR from price data
function calculateCAGR(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0;
  return parseFloat(((Math.pow(endPrice / startPrice, 1 / years) - 1) * 100).toFixed(1));
}

// Process time series data from Twelve Data
function processTimeSeriesData(data: any): CAGRData {
  const values = data.values;
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error('Invalid time series data format');
  }

  // Sort by date (newest first)
  const sortedValues = values.sort((a: any, b: any) => 
    new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );

  const currentPrice = parseFloat(sortedValues[0].close);
  const currentDate = new Date(sortedValues[0].datetime);

  // Find prices for CAGR calculations
  const oneYearAgo = new Date(currentDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const fiveYearsAgo = new Date(currentDate);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  const tenYearsAgo = new Date(currentDate);
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  // Find closest dates
  const findClosestPrice = (targetDate: Date) => {
    let closest = null;
    let minDiff = Infinity;
    
    for (const value of sortedValues) {
      const valueDate = new Date(value.datetime);
      const diff = Math.abs(valueDate.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = value;
      }
    }
    
    return closest ? parseFloat(closest.close) : null;
  };

  const price1Y = findClosestPrice(oneYearAgo);
  const price5Y = findClosestPrice(fiveYearsAgo);
  const price10Y = findClosestPrice(tenYearsAgo);

  const cagr1Y = price1Y ? calculateCAGR(price1Y, currentPrice, 1) : 'N/A' as const;
  const cagr5Y = price5Y ? calculateCAGR(price5Y, currentPrice, 5) : 'N/A' as const;
  const cagr10Y = price10Y ? calculateCAGR(price10Y, currentPrice, 10) : 'N/A' as const;

  // Get yearly breakdown for the last 5 years
  const yearlyData: Array<{ year: number; price: number }> = [];
  const currentYear = currentDate.getFullYear();
  
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    const yearEnd = new Date(year, 11, 31); // December 31st
    const yearPrice = findClosestPrice(yearEnd);
    
    if (yearPrice) {
      yearlyData.push({ year, price: yearPrice });
    }
  }

  return {
    currentPrice,
    lastUpdate: new Date().toISOString(),
    cagr1Y,
    cagr5Y,
    cagr10Y,
    yearlyData: yearlyData.reverse() // Oldest to newest
  };
}

// Fetch data from Twelve Data API
async function fetchTwelveData(symbol: string, assetType: 'stock' | 'crypto', exchange?: string): Promise<FetchResult> {
  try {
    // Build URL based on asset type
    let url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=5000&apikey=${API_KEY}`;
    
    if (assetType === 'stock' && exchange) {
      url += `&exchange=${exchange}`;
    }

    console.log(`Fetching data from Twelve Data: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'error') {
      return { success: false, error: `API Error: ${data.message}` };
    }
    
    if (data.code === 429) {
      return { success: false, error: 'API rate limit reached. Please try again later.' };
    }
    
    if (!data.values) {
      return { success: false, error: 'No data available for this symbol' };
    }
    
    const processedData = processTimeSeriesData(data);
    return { success: true, data: processedData };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Main function to get CAGR data with Supabase caching
export async function getAssetCAGR(assetName: string): Promise<CAGRResult> {
  try {
    // Get symbol info
    const assetInfo = SYMBOL_MAP[assetName];
    if (!assetInfo) {
      console.log(`No mapping found for ${assetName}, using fallback`);
      const fallbackData = FALLBACK_CAGR[assetName] || { 
        cagr1Y: 10, 
        cagr5Y: 10, 
        cagr10Y: 10,
        currentPrice: 100,
        lastUpdate: new Date().toISOString(),
        yearlyData: []
      };
      return { 
        data: fallbackData, 
        isFallback: true, 
        errorMessage: 'Asset not supported for live data' 
      };
    }

    // Check Supabase cache first (shared across all users)
    const supabaseCached = await getSupabaseCachedData(assetInfo.symbol);
    if (supabaseCached) {
      console.log(`Using Supabase cached data for ${assetName}`);
      
      // Also update local cache
      const cacheData: CachedData = {
        data: supabaseCached,
        timestamp: Date.now()
      };
      await setStorageItem(`cagr_${assetName}`, JSON.stringify(cacheData));
      
      return { data: supabaseCached, isFallback: false };
    }

    // Check local cache as fallback
    const localCached = await getCachedData(assetName);
    if (localCached) {
      console.log(`Using local cached data for ${assetName}`);
      return { data: localCached.data, isFallback: false };
    }
    
    console.log(`Fetching fresh data for ${assetName} (${assetInfo.symbol})`);
    
    // Fetch fresh data from Twelve Data
    const fetchResult = await fetchTwelveData(assetInfo.symbol, assetInfo.type, assetInfo.exchange);
    
    if (fetchResult.success && fetchResult.data) {
      // Save to both Supabase and local cache
      await saveToSupabaseCache(assetInfo.symbol, assetInfo.type, fetchResult.data);
      
      const cacheData: CachedData = {
        data: fetchResult.data,
        timestamp: Date.now()
      };
      await setStorageItem(`cagr_${assetName}`, JSON.stringify(cacheData));
      
      console.log(`Successfully fetched and cached data for ${assetName}`);
      return { data: fetchResult.data, isFallback: false };
    } else {
      // API failed, return fallback data with error message
      console.log(`API failed for ${assetName}, using fallback data. Error: ${fetchResult.error}`);
      const fallbackData = FALLBACK_CAGR[assetName] || { 
        cagr1Y: 10, 
        cagr5Y: 10, 
        cagr10Y: 10,
        currentPrice: 100,
        lastUpdate: new Date().toISOString(),
        yearlyData: []
      };
      
      return { 
        data: fallbackData, 
        isFallback: true, 
        errorMessage: fetchResult.error 
      };
    }
    
  } catch (error) {
    console.error(`Unexpected error fetching CAGR for ${assetName}:`, error);
    
    // Return fallback data for any unexpected errors
    const fallback = FALLBACK_CAGR[assetName] || { 
      cagr1Y: 10, 
      cagr5Y: 10, 
      cagr10Y: 10,
      currentPrice: 100,
      lastUpdate: new Date().toISOString(),
      yearlyData: []
    };
    
    return { 
      data: fallback, 
      isFallback: true, 
      errorMessage: 'Unexpected error occurred' 
    };
  }
}

// Clear all caches for testing purposes
export async function clearCAGRCache(): Promise<void> {
  // Clear local cache
  if (Platform.OS === 'web') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cagr_')) {
        localStorage.removeItem(key);
      }
    });
  } else {
    storage.clear();
  }

  // Clear Supabase cache
  try {
    const { error } = await supabase
      .from('market_data_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('Error clearing Supabase cache:', error);
    } else {
      console.log('Supabase cache cleared');
    }
  } catch (error) {
    console.error('Error clearing Supabase cache:', error);
  }
  
  console.log('All CAGR caches cleared');
}

// Get cache status for debugging
export async function getCacheStatus(): Promise<Record<string, { cached: boolean; age?: number; source?: string }>> {
  const status: Record<string, { cached: boolean; age?: number; source?: string }> = {};
  
  for (const assetName of Object.keys(SYMBOL_MAP)) {
    const assetInfo = SYMBOL_MAP[assetName];
    
    // Check Supabase cache
    const supabaseCached = await getSupabaseCachedData(assetInfo.symbol);
    if (supabaseCached) {
      status[assetName] = {
        cached: true,
        age: Date.now() - new Date(supabaseCached.lastUpdate).getTime(),
        source: 'supabase'
      };
      continue;
    }

    // Check local cache
    const localCached = await getCachedData(assetName);
    if (localCached) {
      status[assetName] = {
        cached: true,
        age: Date.now() - localCached.timestamp,
        source: 'local'
      };
    } else {
      status[assetName] = { cached: false };
    }
  }
  
  return status;
}

// Force refresh data for a specific asset (bypasses cache)
export async function forceRefreshAsset(assetName: string): Promise<CAGRResult> {
  const assetInfo = SYMBOL_MAP[assetName];
  if (!assetInfo) {
    return {
      data: FALLBACK_CAGR[assetName] || { 
        cagr1Y: 10, 
        cagr5Y: 10, 
        cagr10Y: 10,
        currentPrice: 100,
        lastUpdate: new Date().toISOString(),
        yearlyData: []
      },
      isFallback: true,
      errorMessage: 'Asset not supported for live data'
    };
  }

  console.log(`Force refreshing data for ${assetName} (${assetInfo.symbol})`);
  
  const fetchResult = await fetchTwelveData(assetInfo.symbol, assetInfo.type, assetInfo.exchange);
  
  if (fetchResult.success && fetchResult.data) {
    // Save to both caches
    await saveToSupabaseCache(assetInfo.symbol, assetInfo.type, fetchResult.data);
    
    const cacheData: CachedData = {
      data: fetchResult.data,
      timestamp: Date.now()
    };
    await setStorageItem(`cagr_${assetName}`, JSON.stringify(cacheData));
    
    return { data: fetchResult.data, isFallback: false };
  } else {
    return {
      data: FALLBACK_CAGR[assetName] || { 
        cagr1Y: 10, 
        cagr5Y: 10, 
        cagr10Y: 10,
        currentPrice: 100,
        lastUpdate: new Date().toISOString(),
        yearlyData: []
      },
      isFallback: true,
      errorMessage: fetchResult.error
    };
  }
}