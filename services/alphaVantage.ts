import { Platform } from 'react-native';

// For web platform, use localStorage; for mobile, we'll use a simple in-memory cache
const storage = Platform.OS === 'web' ? localStorage : new Map();

const API_KEY = 'REG505SH1PWQK42L';
const BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Asset mapping for Alpha Vantage API
const SYMBOL_MAP: Record<string, { symbol: string; type: 'crypto' | 'stock'; currency?: string }> = {
  'BTC': { symbol: 'BTC', type: 'crypto', currency: 'USD' },
  'Bitcoin': { symbol: 'BTC', type: 'crypto', currency: 'USD' },
  'SPX': { symbol: 'SPY', type: 'stock' }, // Use SPY as proxy for S&P 500
  'S&P 500': { symbol: 'SPY', type: 'stock' },
  'QQQ': { symbol: 'QQQ', type: 'stock' },
  'NVDA': { symbol: 'NVDA', type: 'stock' },
  'NVIDIA': { symbol: 'NVDA', type: 'stock' },
  'TSLA': { symbol: 'TSLA', type: 'stock' },
  'Tesla': { symbol: 'TSLA', type: 'stock' },
  'MSTR': { symbol: 'MSTR', type: 'stock' },
  'MTPLF': { symbol: 'MTPLF', type: 'stock' },
  'Metaplanet': { symbol: 'MTPLF', type: 'stock' }
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

// Check cache first
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
    console.error('Cache read error:', error);
  }
  return null;
}

// Calculate CAGR from price data
function calculateCAGR(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0;
  return parseFloat(((Math.pow(endPrice / startPrice, 1 / years) - 1) * 100).toFixed(1));
}

// Find closest date in historical data
function findClosestDate(dates: string[], daysAgo: number): string | null {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);
  
  // Sort dates in descending order and find the first date <= target
  const sortedDates = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return sortedDates.find(date => new Date(date) <= targetDate) || null;
}

// Find year-end price for yearly breakdown
function findYearEnd(dates: string[], year: number): string | null {
  const yearEndDates = dates.filter(date => {
    const d = new Date(date);
    return d.getFullYear() === year && d.getMonth() === 11; // December
  });
  
  if (yearEndDates.length === 0) {
    // If no December data, find the last date of the year
    const yearDates = dates.filter(date => new Date(date).getFullYear() === year);
    return yearDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
  }
  
  return yearEndDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

// Get yearly breakdown for the last 5 years
function getYearlyBreakdown(timeSeries: any, dates: string[], priceKey: string): Array<{ year: number; price: number }> {
  const yearlyData: Array<{ year: number; price: number }> = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    const yearEnd = findYearEnd(dates, year);
    if (yearEnd && timeSeries[yearEnd]) {
      const price = parseFloat(timeSeries[yearEnd][priceKey]);
      if (!isNaN(price)) {
        yearlyData.push({ year, price });
      }
    }
  }
  
  return yearlyData.reverse(); // Oldest to newest
}

// Process cryptocurrency data from Alpha Vantage
function processCryptoData(data: any): CAGRData {
  const timeSeries = data['Time Series (Digital Currency Daily)'];
  if (!timeSeries) {
    throw new Error('Invalid crypto data format');
  }
  
  const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  if (dates.length === 0) {
    throw new Error('No price data available');
  }
  
  const today = dates[0];
  const oneYearAgo = findClosestDate(dates, 365);
  const fiveYearsAgo = findClosestDate(dates, 365 * 5);
  const tenYearsAgo = findClosestDate(dates, 365 * 10);
  
  const currentPrice = parseFloat(timeSeries[today]['4a. close (USD)']);
  
  const cagr1Y = oneYearAgo ? calculateCAGR(
    parseFloat(timeSeries[oneYearAgo]['4a. close (USD)']),
    currentPrice,
    1
  ) : 'N/A' as const;
  
  const cagr5Y = fiveYearsAgo ? calculateCAGR(
    parseFloat(timeSeries[fiveYearsAgo]['4a. close (USD)']),
    currentPrice,
    5
  ) : 'N/A' as const;
  
  const cagr10Y = tenYearsAgo ? calculateCAGR(
    parseFloat(timeSeries[tenYearsAgo]['4a. close (USD)']),
    currentPrice,
    10
  ) : 'N/A' as const;
  
  return {
    currentPrice,
    lastUpdate: new Date().toISOString(),
    cagr1Y,
    cagr5Y,
    cagr10Y,
    yearlyData: getYearlyBreakdown(timeSeries, dates, '4a. close (USD)')
  };
}

// Process stock data from Alpha Vantage
function processStockData(data: any): CAGRData {
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error('Invalid stock data format');
  }
  
  const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  if (dates.length === 0) {
    throw new Error('No price data available');
  }
  
  const today = dates[0];
  const oneYearAgo = findClosestDate(dates, 365);
  const fiveYearsAgo = findClosestDate(dates, 365 * 5);
  const tenYearsAgo = findClosestDate(dates, 365 * 10);
  
  const currentPrice = parseFloat(timeSeries[today]['5. adjusted close']);
  
  const cagr1Y = oneYearAgo ? calculateCAGR(
    parseFloat(timeSeries[oneYearAgo]['5. adjusted close']),
    currentPrice,
    1
  ) : 'N/A' as const;
  
  const cagr5Y = fiveYearsAgo ? calculateCAGR(
    parseFloat(timeSeries[fiveYearsAgo]['5. adjusted close']),
    currentPrice,
    5
  ) : 'N/A' as const;
  
  const cagr10Y = tenYearsAgo ? calculateCAGR(
    parseFloat(timeSeries[tenYearsAgo]['5. adjusted close']),
    currentPrice,
    10
  ) : 'N/A' as const;
  
  return {
    currentPrice,
    lastUpdate: new Date().toISOString(),
    cagr1Y,
    cagr5Y,
    cagr10Y,
    yearlyData: getYearlyBreakdown(timeSeries, dates, '5. adjusted close')
  };
}

// Fetch crypto data (Bitcoin) - returns structured result instead of throwing
async function fetchCryptoData(symbol: string, currency: string = 'USD'): Promise<FetchResult> {
  try {
    const url = `${BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=${currency}&apikey=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message']) {
      return { success: false, error: `API Error: ${data['Error Message']}` };
    }
    
    if (data['Note']) {
      return { success: false, error: 'API rate limit reached. Please try again later.' };
    }
    
    if (data['Information']) {
      return { success: false, error: 'API rate limit reached. Please try again later.' };
    }
    
    const processedData = processCryptoData(data);
    return { success: true, data: processedData };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Fetch stock data - returns structured result instead of throwing
async function fetchStockData(symbol: string): Promise<FetchResult> {
  try {
    const url = `${BASE_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message']) {
      return { success: false, error: `API Error: ${data['Error Message']}` };
    }
    
    if (data['Note']) {
      return { success: false, error: 'API rate limit reached. Please try again later.' };
    }
    
    if (data['Information']) {
      return { success: false, error: 'API rate limit reached. Please try again later.' };
    }
    
    const processedData = processStockData(data);
    return { success: true, data: processedData };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Main function to get CAGR data - now returns structured result with fallback handling
export async function getAssetCAGR(assetName: string): Promise<CAGRResult> {
  try {
    // Check cache first
    const cached = await getCachedData(assetName);
    if (cached) {
      console.log(`Using cached data for ${assetName}`);
      return { data: cached.data, isFallback: false };
    }
    
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
    
    console.log(`Fetching fresh data for ${assetName} (${assetInfo.symbol})`);
    
    // Fetch fresh data
    let fetchResult: FetchResult;
    if (assetInfo.type === 'crypto') {
      fetchResult = await fetchCryptoData(assetInfo.symbol, assetInfo.currency);
    } else {
      fetchResult = await fetchStockData(assetInfo.symbol);
    }
    
    if (fetchResult.success && fetchResult.data) {
      // Cache the successful result
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

// Clear cache for testing purposes
export async function clearCAGRCache(): Promise<void> {
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
  console.log('CAGR cache cleared');
}

// Get cache status for debugging
export async function getCacheStatus(): Promise<Record<string, { cached: boolean; age?: number }>> {
  const status: Record<string, { cached: boolean; age?: number }> = {};
  
  for (const assetName of Object.keys(SYMBOL_MAP)) {
    const cached = await getCachedData(assetName);
    if (cached) {
      status[assetName] = {
        cached: true,
        age: Date.now() - cached.timestamp
      };
    } else {
      status[assetName] = { cached: false };
    }
  }
  
  return status;
}