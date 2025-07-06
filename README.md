# Freedom21 - Wealth Calculator
## Developer Documentation

A sophisticated React Native Expo application for investment planning and wealth calculation with Bitcoin benchmark comparisons. Built with Expo SDK 53.0.0 and modern React Native practices.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)

### Installation
```bash
git clone <repository-url>
cd freedom21-wealth-calculator
npm install
npm run dev
```

### Development Server
- **Web**: Opens automatically in browser at `http://localhost:8081`
- **Mobile**: Scan QR code with Expo Go app
- **Hot Reload**: Enabled for all platforms

---

## 📁 Project Architecture

### File Structure
```
freedom21-wealth-calculator/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with Stack navigator
│   ├── (tabs)/                  # Tab-based navigation group
│   │   ├── _layout.tsx         # Tab bar configuration
│   │   ├── index.tsx           # Calculator (main screen)
│   │   ├── charts.tsx          # Investment growth charts
│   │   ├── table.tsx           # Annual breakdown table
│   │   ├── retirement.tsx      # Retirement income planning
│   │   ├── scenarios.tsx       # Saved scenarios management
│   │   └── settings.tsx        # App settings
│   └── +not-found.tsx          # 404 error page
├── components/                   # Reusable UI components
│   ├── AnimatedCard.tsx        # Animated container component
│   ├── GlassCard.tsx           # Glass morphism card
│   ├── ModernSlider.tsx        # Custom slider component
│   ├── ModernChart.tsx         # Chart wrapper component
│   ├── CompoundInterestChart.tsx # Compound interest visualization
│   └── LiveCAGRDisplay.tsx     # Live market data component
├── services/                     # External API integrations
│   └── alphaVantage.ts         # Market data service
├── hooks/                        # Custom React hooks
│   └── useFrameworkReady.ts    # Required framework initialization
├── assets/                       # Static assets
│   └── images/                 # App icons and images
├── package.json                  # Dependencies and scripts
├── app.json                      # Expo configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                     # This file
```

### Navigation Architecture
- **Primary**: Tab-based navigation (6 tabs)
- **Secondary**: Stack navigation within tabs
- **Routing**: File-based routing with Expo Router 5.0.2
- **Deep Linking**: Automatic route generation

---

## 🛠 Technology Stack

### Core Framework
- **React Native**: 0.79.1
- **Expo SDK**: 53.0.0
- **Expo Router**: 5.0.2
- **TypeScript**: 5.8.3

### UI & Styling
- **Styling**: StyleSheet.create (no external CSS frameworks)
- **Icons**: Lucide React Native
- **Fonts**: Inter via @expo-google-fonts
- **Gradients**: expo-linear-gradient
- **Animations**: react-native-reanimated

### Charts & Data Visualization
- **Charts**: Custom React Native components with recharts for web
- **Animations**: react-native-reanimated for smooth interactions
- **Responsive**: Platform-specific optimizations

### Data & State Management
- **State**: React hooks (useState, useEffect)
- **Persistence**: localStorage (web), AsyncStorage (mobile)
- **Sync**: Cross-tab synchronization via storage events
- **API**: Alpha Vantage for live market data

---

## 💡 Core Features

### 1. Investment Calculator
**Location**: `app/(tabs)/index.tsx`

**Key Capabilities:**
- Dollar Cost Averaging (DCA) calculations
- Lump sum + monthly contribution strategies
- Advanced options: pause savings, boost savings
- Multiple asset support (BTC, stocks, ETFs, custom)
- Bitcoin benchmark comparisons
- Real-time calculation updates

**Calculation Engine:**
```typescript
// Standard DCA Formula
FV = P × (((1 + r)^n - 1) / r) + S × (1 + r)^n

// Where:
// FV = Future Value
// P = Monthly Payment
// r = Monthly Interest Rate
// n = Number of Periods
// S = Starting Amount
```

### 2. Live Market Data
**Location**: `services/alphaVantage.ts`

**Features:**
- Real-time CAGR calculations (1Y, 5Y, 10Y)
- 24-hour caching system
- Fallback data for reliability
- Support for stocks and cryptocurrencies
- Rate limit handling

**Supported Assets:**
- Bitcoin (BTC)
- S&P 500 (SPY proxy)
- Nasdaq 100 (QQQ)
- Individual stocks (NVDA, TSLA, MSTR, MTPLF)

### 3. Interactive Charts
**Location**: `app/(tabs)/charts.tsx`, `components/CompoundInterestChart.tsx`

**Chart Types:**
- Compound interest visualization (stacked areas/bars)
- Portfolio comparison (line/area charts)
- Mobile story mode for education
- Responsive design for all screen sizes

### 4. Annual Breakdown
**Location**: `app/(tabs)/table.tsx`

**Features:**
- Year-by-year portfolio analysis
- Desktop table view with full data
- Mobile card-based layout
- Performance indicators and insights

### 5. Retirement Planning
**Location**: `app/(tabs)/retirement.tsx`

**Capabilities:**
- Convert wealth to monthly income
- ETF-based income strategies
- Multiple data sources (calculator, scenarios, manual)
- Income vs growth strategy comparison

### 6. Scenario Management
**Location**: `app/(tabs)/scenarios.tsx`

**Features:**
- Save unlimited investment scenarios
- Compare strategies side-by-side
- Share scenarios via web share API
- Performance analytics and summaries

---

## 🔧 Development Guide

### State Management Pattern

**Calculator State:**
```typescript
interface CalculatorState {
  startingAmount: number;
  monthlyAmount: number;
  years: number;
  currentAge: number | null;
  btcHurdleRate: number;
  selectedAsset: string;
  customCAGR: number;
  // Advanced options
  pauseAfterYears: number | null;
  boostAfterYears: number | null;
  boostAmount: number;
  useRealisticCAGR: boolean;
  useDecliningRates: boolean;
  // ... more options
}
```

**Persistence Pattern:**
```typescript
// Save state
useEffect(() => {
  const state = { /* calculator state */ };
  localStorage.setItem('freedom21_calculator_state', JSON.stringify(state));
  
  // Dispatch for cross-tab sync
  window.dispatchEvent(new CustomEvent('calculatorStateUpdate', { detail: state }));
}, [/* dependencies */]);

// Load state
useEffect(() => {
  const savedState = localStorage.getItem('freedom21_calculator_state');
  if (savedState) {
    setCalculatorState(JSON.parse(savedState));
  }
}, []);
```

### Component Architecture

**Reusable Components:**
- `AnimatedCard`: Fade-in animation wrapper
- `GlassCard`: Glass morphism container
- `ModernSlider`: Custom slider with haptic feedback
- `LiveCAGRDisplay`: Expandable market data display

**Component Pattern:**
```typescript
interface ComponentProps {
  // Define props with TypeScript
}

export default function Component({ prop1, prop2 }: ComponentProps) {
  // Component logic
  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Styles using design tokens
  },
});
```

### Styling System

**Design Tokens:**
```typescript
const colors = {
  primary: '#00D4AA',      // Teal
  secondary: '#FB923C',    // Orange
  background: '#0A0E1A',   // Dark blue
  surface: '#1E293B',      // Lighter dark blue
  text: '#FFFFFF',         // White
  textSecondary: '#94A3B8', // Gray
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

**Responsive Design:**
```typescript
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const styles = StyleSheet.create({
  container: {
    padding: isMobile ? 16 : 24,
    // Platform-specific styles
  },
});
```

### API Integration

**Alpha Vantage Service:**
```typescript
// Get CAGR data with fallback
export async function getAssetCAGR(assetName: string): Promise<CAGRResult> {
  try {
    // Check cache first
    const cached = await getCachedData(assetName);
    if (cached) return { data: cached.data, isFallback: false };
    
    // Fetch fresh data
    const result = await fetchMarketData(assetName);
    if (result.success) {
      // Cache and return
      await cacheData(assetName, result.data);
      return { data: result.data, isFallback: false };
    } else {
      // Return fallback data
      return { 
        data: FALLBACK_CAGR[assetName], 
        isFallback: true, 
        errorMessage: result.error 
      };
    }
  } catch (error) {
    // Always return fallback for any error
    return { 
      data: FALLBACK_CAGR[assetName], 
      isFallback: true, 
      errorMessage: 'Unexpected error' 
    };
  }
}
```

---

## 🧮 Calculation Engine

### Core Formulas

**Standard DCA (Dollar Cost Averaging):**
```typescript
function calculateDCA(monthlyAmount: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;
  
  if (monthlyRate === 0) {
    return monthlyAmount * totalMonths;
  }
  
  return monthlyAmount * (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
}
```

**Lump Sum + DCA:**
```typescript
function calculateLumpSumPlusDCA(
  startingAmount: number,
  monthlyAmount: number,
  annualRate: number,
  years: number
): number {
  const rate = annualRate / 100;
  
  // Lump sum growth
  const lumpSumFV = startingAmount * Math.pow(1 + rate, years);
  
  // DCA calculation
  const dcaFV = calculateDCA(monthlyAmount, annualRate, years);
  
  return lumpSumFV + dcaFV;
}
```

**Complex Strategies (Pause/Boost):**
```typescript
function calculateYearByYearProgression(
  startingAmount: number,
  monthlyAmount: number,
  baseGrowthRate: number,
  targetYear: number,
  pauseAfterYears: number | null,
  boostAfterYears: number | null,
  boostAmount: number
): number {
  let totalValue = startingAmount;

  for (let year = 1; year <= targetYear; year++) {
    const rate = getEffectiveGrowthRate(year, baseGrowthRate) / 100;
    
    let monthlyContrib = monthlyAmount;
    if (pauseAfterYears && year > pauseAfterYears) {
      monthlyContrib = 0;
    } else if (boostAfterYears && year > boostAfterYears) {
      monthlyContrib = boostAmount;
    }

    const yearlyContrib = monthlyContrib * 12;
    totalValue = totalValue * (1 + rate) + yearlyContrib;
  }

  return Math.round(totalValue);
}
```

### Advanced Features

**Declining Growth Rates:**
```typescript
function getEffectiveGrowthRate(year: number, baseRate: number): number {
  let rate = baseRate;
  
  if (useDecliningRates) {
    if (year <= 10) rate = phase1Rate;
    else if (year <= 20) rate = phase2Rate;
    else rate = phase3Rate;
  }
  
  if (useRealisticCAGR) rate = rate * 0.6;
  if (useInflationAdjustment) rate = rate - inflationRate;
  
  return Math.max(0, rate);
}
```

**Compound Interest Breakdown:**
```typescript
function calculateCompoundBreakdown(principal: number, rate: number, years: number) {
  const simpleInterest = principal * rate * years;
  const compoundInterest = principal * Math.pow(1 + rate, years);
  const compoundGains = compoundInterest - principal;
  
  return {
    principal,
    simpleInterest: principal + simpleInterest,
    compoundInterest,
    compoundGains,
  };
}
```

---

## 📱 Platform Considerations

### Web Platform (Primary)
- **Storage**: localStorage for persistence
- **Performance**: Optimized for desktop and mobile browsers
- **Features**: Full feature set including web share API
- **Responsive**: Adaptive layouts for all screen sizes

### Mobile Platforms
- **Storage**: AsyncStorage for React Native
- **Touch**: Optimized touch targets (44px minimum)
- **Gestures**: Native gesture handling
- **Performance**: 60fps animations and interactions

### Platform-Specific Code
```typescript
import { Platform } from 'react-native';

const saveData = (data: any) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('key', JSON.stringify(data));
  } else {
    // Use AsyncStorage for mobile
    AsyncStorage.setItem('key', JSON.stringify(data));
  }
};
```

---

## 🎨 Design System

### Color Palette
```typescript
const colors = {
  // Primary colors
  primary: '#00D4AA',        // Teal (main brand)
  primaryDark: '#00A887',    // Darker teal
  secondary: '#FB923C',      // Orange (accent)
  
  // Background colors
  background: '#0A0E1A',     // Main background
  surface: '#1E293B',        // Card backgrounds
  surfaceLight: '#334155',   // Lighter surfaces
  
  // Text colors
  text: '#FFFFFF',           // Primary text
  textSecondary: '#94A3B8',  // Secondary text
  textTertiary: '#64748B',   // Tertiary text
  
  // Status colors
  success: '#00D4AA',        // Success states
  warning: '#F59E0B',        // Warning states
  error: '#EF4444',          // Error states
  
  // Chart colors
  bitcoin: '#F59E0B',        // Bitcoin orange
  principal: '#1E40AF',      // Principal blue
  compound: '#00D4AA',       // Compound teal
};
```

### Typography
```typescript
const typography = {
  // Font families
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  
  // Line heights
  tight: 1.2,    // For headings
  normal: 1.5,   // For body text
  relaxed: 1.6,  // For long-form content
};
```

### Spacing System
```typescript
const spacing = {
  0: 0,
  1: 4,    // 0.25rem
  2: 8,    // 0.5rem
  3: 12,   // 0.75rem
  4: 16,   // 1rem
  5: 20,   // 1.25rem
  6: 24,   // 1.5rem
  8: 32,   // 2rem
  10: 40,  // 2.5rem
  12: 48,  // 3rem
  16: 64,  // 4rem
  20: 80,  // 5rem
};
```

---

## 🧪 Testing Strategy

### Manual Testing Scenarios

**1. Basic Calculator Tests:**
```typescript
// Test Case 1: Standard DCA
Input: $500/month, 20 years, 30% CAGR
Expected: ~$3,781,020 future value

// Test Case 2: Lump Sum + DCA
Input: $10,000 start + $500/month, 20 years, 30% CAGR
Expected: ~$4,971,020 future value

// Test Case 3: Pause Strategy
Input: $500/month, pause after 10 years, 30% CAGR, 20 total years
Expected: ~$1,141,089 future value
```

**2. Cross-Platform Tests:**
- Web browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness (iOS Safari, Android Chrome)
- Touch interactions and gesture handling
- Performance on different devices

**3. Data Persistence Tests:**
- Calculator state saving/loading
- Cross-tab synchronization
- Scenario management
- Cache invalidation

### Performance Benchmarks
- **Initial Load**: <3 seconds
- **Calculation Speed**: <100ms for complex scenarios
- **Chart Rendering**: <500ms for large datasets
- **Memory Usage**: <50MB for typical usage

### Error Handling Tests
- **API Failures**: Graceful fallback to cached/default data
- **Invalid Inputs**: Proper validation and user feedback
- **Network Issues**: Offline functionality
- **Edge Cases**: Zero values, extreme inputs

---

## 🚀 Deployment

### Web Deployment (Current)
```bash
# Build for web
npm run build:web

# Deploy to Netlify (automatic)
# Connected to Git repository for automatic deployments
```

### Mobile App Deployment
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for app stores
eas build --platform all

# Submit to stores
eas submit --platform all
```

### Environment Configuration
```bash
# Development
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_ALPHA_VANTAGE_KEY=your_key_here

# Production
EXPO_PUBLIC_API_URL=https://api.production.com
EXPO_PUBLIC_ALPHA_VANTAGE_KEY=production_key
```

---

## 📊 Performance Optimization

### Calculation Optimization
```typescript
// Memoize expensive calculations
const memoizedCalculation = useMemo(() => {
  return calculateComplexScenario(inputs);
}, [inputs]);

// Debounce user inputs
const debouncedValue = useDebounce(inputValue, 300);
```

### Rendering Optimization
```typescript
// Memoize components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Optimize re-renders
const optimizedCallback = useCallback(() => {
  // Callback logic
}, [dependencies]);
```

### Memory Management
- **Chart Data**: Limit data points for large datasets
- **Image Optimization**: Use appropriate image sizes
- **Component Cleanup**: Proper useEffect cleanup
- **Event Listeners**: Remove listeners on unmount

---

## 🔒 Security & Privacy

### Data Security
- **Client-side Only**: No server-side data storage
- **Local Storage**: All data stored locally on device
- **No PII**: No personally identifiable information collected
- **API Keys**: Read-only market data access

### Privacy Compliance
- **No Tracking**: No user analytics or tracking
- **No Accounts**: No user registration required
- **Transparent**: Open calculation methods
- **Disclaimers**: Clear investment risk warnings

### Financial Compliance
- **Educational Tool**: Positioned as educational, not advice
- **Risk Warnings**: Prominent disclaimers about investment risks
- **No Guarantees**: Clear statements about past performance
- **Terms of Service**: Comprehensive usage terms

---

## 🐛 Troubleshooting

### Common Issues

**1. Fonts Not Loading**
```typescript
// Check font loading in _layout.tsx
const [fontsLoaded, fontError] = useFonts({
  'Inter-Regular': Inter_400Regular,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
});

// Ensure SplashScreen.hideAsync() is called after fonts load
```

**2. Charts Not Displaying**
```typescript
// Verify chart data format
const chartData = [
  { year: '0', asset: 0, bitcoin: 0 },
  { year: '1', asset: 6000, bitcoin: 6500 },
  // ... more data points
];

// Check component dimensions
const chartWidth = width - 40; // Account for padding
const chartHeight = 300; // Fixed height
```

**3. State Synchronization Issues**
```typescript
// Check localStorage access
if (typeof Storage !== 'undefined') {
  localStorage.setItem('key', 'value');
} else {
  // Fallback for environments without localStorage
}

// Verify event listeners
window.addEventListener('storage', handleStorageChange);
window.addEventListener('calculatorStateUpdate', handleUpdate);

// Clean up listeners
return () => {
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener('calculatorStateUpdate', handleUpdate);
};
```

**4. API Rate Limiting**
```typescript
// Check cache status
const cached = await getCachedData(assetName);
if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
  return cached.data; // Use cached data
}

// Implement exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
};
```

### Debug Mode
Enable detailed logging by setting debug flags:
```typescript
const DEBUG = __DEV__ || process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Calculation steps:', {
    input: { monthlyAmount, years, rate },
    intermediate: { monthlyRate, totalMonths },
    output: { futureValue }
  });
}
```

---

## 📈 Analytics & Monitoring

### Google Analytics Integration

The app includes comprehensive Google Analytics tracking using Firebase Analytics:

**Tracked Events:**
- Page views and screen navigation
- Calculator usage with parameters (asset, amount, timeframe)
- Scenario saves and comparisons
- Chart interactions and timeframe changes
- Retirement planning usage
- Live CAGR data usage
- User sign ups and sign ins
- Feature usage across all tabs
- User engagement time tracking

**Implementation:**
- Cross-platform support (web and mobile)
- Automatic page view tracking
- Custom event tracking for business metrics
- User property and ID tracking
- Engagement time measurement

**Configuration:**
- Measurement ID: `G-8N2LSBDFJ5`
- Firebase project integration
- Web and mobile platform support

### Performance Monitoring
```typescript
// Track calculation performance
const startTime = performance.now();
const result = calculateComplexScenario(inputs);
const endTime = performance.now();

if (endTime - startTime > 100) {
  console.warn('Slow calculation detected:', endTime - startTime);
}
```

### Error Tracking
```typescript
// Global error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
    // Send to error tracking service
  }
}
```

### User Experience Metrics
- **Load Time**: Time to interactive
- **Calculation Speed**: Formula execution time
- **Chart Rendering**: Visualization performance
- **Navigation**: Route transition speed

---

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Use strict type checking
- **ESLint**: Follow configured linting rules
- **Prettier**: Use for code formatting
- **Comments**: Document complex calculations and business logic

### Testing Requirements
- **Unit Tests**: For calculation functions
- **Integration Tests**: For component interactions
- **Manual Testing**: Cross-platform compatibility
- **Performance Tests**: Benchmark critical paths

---

## 📚 Additional Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Guide](https://expo.github.io/router/)
- [Alpha Vantage API](https://www.alphavantage.co/documentation/)

### Learning Resources
- [React Native Tutorial](https://reactnative.dev/docs/tutorial)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Financial Calculations](https://www.investopedia.com/articles/03/101503.asp)
- [Compound Interest Mathematics](https://www.mathsisfun.com/money/compound-interest.html)

### Community
- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For technical support or questions:
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for general questions
- **Email**: [Your contact email]
- **Documentation**: Check this README and inline code comments

---

**Built with ❤️ using Expo and React Native**

*Last updated: January 2025*