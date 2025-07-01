# Freedom21 - Wealth Calculator
## Product Requirements Document (PRD)

### Executive Summary

Freedom21 is a sophisticated wealth calculation and investment planning application built with React Native and Expo. The app helps users project their financial future through Dollar Cost Averaging (DCA) strategies, compare investments against Bitcoin benchmarks, and plan for retirement income. It features advanced calculation engines, interactive charts, scenario management, and retirement planning tools.

### Product Vision

To democratize financial planning by providing users with professional-grade investment calculation tools that are accessible, educational, and actionable. Freedom21 empowers users to make informed investment decisions through clear visualizations and comprehensive analysis.

### Target Audience

**Primary Users:**
- Individual investors (ages 25-55)
- Cryptocurrency enthusiasts
- Retirement planners
- Financial literacy learners

**Secondary Users:**
- Financial advisors (for client demonstrations)
- Investment educators
- Personal finance content creators

### Core Value Propositions

1. **Bitcoin Benchmark Comparison**: Unique feature comparing any investment against Bitcoin's historical performance
2. **Advanced DCA Strategies**: Support for pausing, boosting, and complex contribution patterns
3. **Comprehensive Visualization**: Multiple chart types showing compound interest effects
4. **Retirement Income Planning**: Convert wealth projections into monthly income streams
5. **Scenario Management**: Save and compare multiple investment strategies
6. **Educational Focus**: Built-in explanations and insights about compound interest

---

## Feature Specifications

### 1. Investment Calculator (Core Feature)

**Purpose**: Calculate future wealth using various investment strategies

**Key Features:**
- Starting amount input (optional lump sum)
- Monthly contribution slider ($50-$10,000)
- Time horizon selector (1-50 years)
- Current age tracking with future age projection
- Asset selection (BTC, SPX, QQQ, NVDA, TSLA, MSTR, MTPLF, Custom)
- Custom CAGR input with live data integration
- Bitcoin hurdle rate benchmark

**Advanced Strategy Options:**
- Conservative CAGR (60% of optimistic rates)
- Declining growth rates over time phases
- Inflation adjustment capabilities
- Pause savings strategy (stop contributions after X years)
- Boost savings strategy (increase contributions after X years)

**Calculations:**
- Uses proper DCA formula with annual compounding
- Year-by-year progression for complex strategies
- Real-time updates across all tabs
- Handles edge cases (negative rates, zero contributions)

**User Interface:**
- Modern sliders with haptic feedback
- Real-time value updates
- Visual indicators for strategy selection
- Collapsible advanced options
- Mobile-optimized layouts

### 2. Live Market Data Integration

**Purpose**: Provide real-time CAGR data for supported assets

**Data Sources:**
- Alpha Vantage API for stock and crypto data
- Fallback data system for reliability
- 24-hour caching mechanism

**Supported Assets:**
- Bitcoin (BTC) - Crypto data
- S&P 500 (SPY proxy) - Stock data
- Nasdaq 100 (QQQ) - Stock data
- Individual stocks (NVDA, TSLA, MSTR, MTPLF)

**Features:**
- Expandable data cards with refresh capability
- 1Y, 5Y, 10Y CAGR calculations
- Current price display
- Recent performance breakdown
- Fallback data with clear indicators
- Cache status and age tracking

### 3. Interactive Charts & Visualizations

**Chart Types:**

**A. Compound Interest Chart**
- Stacked area/bar chart showing principal, simple interest, compound interest
- Mobile story mode with step-by-step revelation
- Timeframe selector (10Y, 20Y, 30Y, 40Y)
- Performance cards showing key metrics
- Educational annotations and insights

**B. Portfolio Comparison Chart**
- Line/area chart comparing asset vs Bitcoin benchmark
- Same strategy applied to both for fair comparison
- Interactive tooltips with value details
- Responsive design for all screen sizes

**Features:**
- Smooth animations using react-native-reanimated
- Mobile-optimized with touch interactions
- Progressive disclosure of information
- Educational overlays and explanations

### 4. Annual Breakdown Table

**Purpose**: Detailed year-by-year analysis of portfolio growth

**Desktop View:**
- Full table with columns: Year, Age, Invested, Portfolio Value, Bitcoin Benchmark, Difference
- Sortable and filterable data
- Color-coded performance indicators
- Grid lines and professional styling

**Mobile View:**
- Card-based layout for each year
- Swipeable interface
- Condensed metrics display
- Touch-optimized interactions

**Features:**
- Progressive X-axis labeling
- Current year indicators
- Performance summary cards
- Formula explanations
- Growth analysis insights

### 5. Retirement Income Planning

**Purpose**: Convert wealth projections into monthly income streams

**Data Sources:**
- Calculator state (automatic sync)
- Saved scenarios (user selection)
- Manual portfolio value input

**ETF Options:**
- STRF (Strife Income ETF) - 10% annual yield
- STRK (Strike Income ETF) - 8% annual yield
- Risk level indicators
- Monthly payment capabilities

**Income Strategies:**
- Take monthly income (4% withdrawal simulation)
- Reinvest and grow (compound growth)
- Time horizon planning (5-30 years)

**Calculations:**
- Monthly income projections
- Total income over time periods
- Portfolio value after income years
- Real purchasing power considerations

### 6. Scenario Management

**Purpose**: Save, compare, and share investment strategies

**Scenario Data:**
- Complete calculator state
- Strategy parameters
- Performance metrics
- Creation timestamps
- Future age projections

**Features:**
- Unlimited scenario storage
- Descriptive naming system
- Performance comparison views
- Share functionality (web share API)
- Bulk management (clear all)
- Summary statistics

**Sharing:**
- Native web share API integration
- Clipboard fallback
- Formatted text with key metrics
- App promotion inclusion

### 7. Settings & Configuration

**App Information:**
- Version display
- Feature explanations
- Educational content

**Support Features:**
- Rate app functionality
- Share app capabilities
- How-it-works explanations

**Legal & Compliance:**
- Investment disclaimers
- Terms of service
- Privacy policy
- Risk warnings

---

## Technical Architecture

### Frontend Framework
- **React Native**: 0.79.1
- **Expo SDK**: 53.0.0
- **Expo Router**: 5.0.2 (file-based routing)
- **TypeScript**: Full type safety

### Navigation Structure
```
app/
├── _layout.tsx (Root layout)
├── (tabs)/
│   ├── _layout.tsx (Tab navigation)
│   ├── index.tsx (Calculator)
│   ├── charts.tsx (Visualizations)
│   ├── table.tsx (Annual breakdown)
│   ├── retirement.tsx (Income planning)
│   ├── scenarios.tsx (Saved scenarios)
│   └── settings.tsx (App settings)
└── +not-found.tsx (404 page)
```

### State Management
- **Local State**: React hooks (useState, useEffect)
- **Persistence**: localStorage (web), AsyncStorage (mobile)
- **Cross-tab Sync**: Storage events and custom events
- **Real-time Updates**: Event-driven state synchronization

### Data Flow
1. User inputs → Calculator state
2. State changes → localStorage persistence
3. Storage events → Cross-tab synchronization
4. State updates → Chart/table re-rendering
5. Scenario saves → Persistent storage

### Styling System
- **StyleSheet.create**: React Native styling
- **Design Tokens**: Consistent colors, spacing, typography
- **Responsive Design**: Platform-specific adaptations
- **Dark Theme**: Professional dark UI with teal accents

### Performance Optimizations
- **Memoization**: React.memo for expensive components
- **Lazy Loading**: Dynamic imports for heavy components
- **Debounced Inputs**: Prevent excessive calculations
- **Efficient Re-renders**: Optimized dependency arrays

---

## API Integration

### Alpha Vantage API
- **Endpoint**: https://www.alphavantage.co/query
- **API Key**: REG505SH1PWQK42L
- **Rate Limits**: 5 calls per minute, 500 per day
- **Caching**: 24-hour cache duration
- **Fallback**: Comprehensive fallback data system

### Data Processing
- **CAGR Calculations**: Proper compound annual growth rate formulas
- **Date Handling**: Closest date matching for historical data
- **Error Handling**: Graceful degradation to fallback data
- **Cache Management**: Automatic cache invalidation and refresh

---

## User Experience Design

### Design Principles
- **Clarity**: Clear information hierarchy
- **Education**: Built-in learning opportunities
- **Accessibility**: Touch-friendly, readable interfaces
- **Performance**: Smooth animations and interactions

### Visual Design
- **Color Palette**: Dark theme with teal (#00D4AA) primary
- **Typography**: Inter font family (Regular, SemiBold, Bold)
- **Spacing**: 8px grid system
- **Components**: Glass morphism effects, gradient backgrounds

### Interaction Design
- **Sliders**: Custom sliders with real-time feedback
- **Charts**: Interactive with tooltips and animations
- **Navigation**: Tab-based with smooth transitions
- **Feedback**: Visual feedback for all user actions

### Mobile Optimization
- **Touch Targets**: Minimum 44px touch areas
- **Gestures**: Swipe, tap, and scroll optimizations
- **Responsive**: Adaptive layouts for all screen sizes
- **Performance**: 60fps animations and interactions

---

## Data Models

### Calculator State
```typescript
interface CalculatorState {
  startingAmount: number;
  monthlyAmount: number;
  years: number;
  currentAge: number | null;
  btcHurdleRate: number;
  selectedAsset: string;
  customCAGR: number;
  pauseAfterYears: number | null;
  boostAfterYears: number | null;
  boostAmount: number;
  useRealisticCAGR: boolean;
  useDecliningRates: boolean;
  phase1Rate: number;
  phase2Rate: number;
  phase3Rate: number;
  inflationRate: number;
  useInflationAdjustment: boolean;
}
```

### Scenario Data
```typescript
interface Scenario {
  id: string;
  name: string;
  startingAmount: number;
  monthlyAmount: number;
  years: number;
  currentAge?: number | null;
  btcHurdleRate: number;
  asset: string;
  cagr: number;
  pauseAfterYears?: number | null;
  boostAfterYears?: number | null;
  boostAmount?: number;
  futureValue: number;
  btcHurdleValue: number;
  outperformance: number;
  targetYear: number;
  futureAge?: number | null;
  createdAt: string;
}
```

### Market Data
```typescript
interface CAGRData {
  currentPrice: number;
  lastUpdate: string;
  cagr1Y: number | 'N/A';
  cagr5Y: number | 'N/A';
  cagr10Y: number | 'N/A';
  yearlyData: Array<{ year: number; price: number }>;
}
```

---

## Security & Privacy

### Data Security
- **Client-side Only**: No server-side data storage
- **Local Storage**: All data stored locally on device
- **No PII**: No personally identifiable information collected
- **API Keys**: Exposed API keys for read-only market data

### Privacy Considerations
- **No Tracking**: No user analytics or tracking
- **No Accounts**: No user registration required
- **Local Data**: All calculations performed locally
- **Transparent**: Open source calculation methods

### Compliance
- **Financial Disclaimers**: Clear investment risk warnings
- **Educational Purpose**: Positioned as educational tool
- **No Financial Advice**: Explicit disclaimers about financial advice
- **Terms of Service**: Clear usage terms and limitations

---

## Testing Strategy

### Unit Testing
- **Calculation Functions**: Comprehensive formula testing
- **Component Logic**: State management and props testing
- **Utility Functions**: Data formatting and validation
- **API Integration**: Mock API responses and error handling

### Integration Testing
- **Cross-tab Sync**: State synchronization testing
- **Navigation**: Route transitions and deep linking
- **Data Persistence**: Storage and retrieval testing
- **Chart Rendering**: Visual component testing

### Manual Testing Scenarios
1. **Basic Calculator**: Standard DCA calculations
2. **Advanced Strategies**: Pause and boost scenarios
3. **Cross-platform**: Web, iOS, Android compatibility
4. **Performance**: Large datasets and complex calculations
5. **Edge Cases**: Zero values, extreme inputs, API failures

### Performance Testing
- **Calculation Speed**: Large dataset processing
- **Memory Usage**: Chart rendering and data storage
- **Animation Performance**: 60fps maintenance
- **API Response Times**: Network request optimization

---

## Deployment & Distribution

### Web Deployment
- **Platform**: Netlify (current)
- **Build Process**: Expo web build
- **Domain**: Custom domain setup available
- **CDN**: Global content delivery
- **SSL**: Automatic HTTPS

### Mobile Distribution
- **Development**: Expo Go for testing
- **Production**: EAS Build for app stores
- **Platforms**: iOS App Store, Google Play Store
- **Updates**: Over-the-air updates via Expo

### CI/CD Pipeline
- **Version Control**: Git-based workflow
- **Automated Testing**: Pre-deployment test suite
- **Build Automation**: Automated builds on push
- **Deployment**: Automatic deployment to staging/production

---

## Analytics & Monitoring

### Performance Monitoring
- **Error Tracking**: Crash reporting and error logs
- **Performance Metrics**: Load times and responsiveness
- **API Monitoring**: Success rates and response times
- **User Experience**: Navigation patterns and usage flows

### Business Metrics
- **User Engagement**: Session duration and feature usage
- **Calculation Accuracy**: Formula validation and testing
- **Feature Adoption**: Most used features and scenarios
- **Platform Distribution**: Web vs mobile usage patterns

---

## Future Roadmap

### Phase 1 Enhancements (Q1 2025)
- **Additional Assets**: More cryptocurrency and stock options
- **Advanced Charts**: More visualization types and interactions
- **Export Features**: PDF reports and data export
- **Social Features**: Scenario sharing and community

### Phase 2 Features (Q2 2025)
- **Portfolio Optimization**: Multi-asset portfolio planning
- **Tax Calculations**: Tax-aware investment planning
- **Goal Setting**: Target-based investment planning
- **Notifications**: Milestone and reminder system

### Phase 3 Expansion (Q3-Q4 2025)
- **Multi-currency**: International market support
- **Real Estate**: Property investment calculations
- **Business Planning**: Startup and business investment tools
- **API Platform**: Third-party integration capabilities

---

## Success Metrics

### User Engagement
- **Daily Active Users**: Target 1,000+ DAU
- **Session Duration**: Average 5+ minutes per session
- **Feature Usage**: 80%+ calculator usage, 60%+ chart viewing
- **Scenario Creation**: Average 3+ scenarios per user

### Technical Performance
- **Load Time**: <3 seconds initial load
- **Calculation Speed**: <100ms for complex calculations
- **Uptime**: 99.9% availability
- **Error Rate**: <0.1% calculation errors

### Business Impact
- **User Satisfaction**: 4.5+ app store rating
- **Educational Value**: Positive user feedback on learning
- **Market Position**: Top 10 in finance education category
- **Community Growth**: Active user community and sharing

---

## Risk Assessment

### Technical Risks
- **API Dependencies**: Alpha Vantage rate limits and availability
- **Platform Changes**: Expo/React Native breaking changes
- **Performance**: Complex calculations on mobile devices
- **Browser Compatibility**: Web platform limitations

### Business Risks
- **Market Competition**: Similar apps and tools
- **Regulatory Changes**: Financial app regulations
- **User Adoption**: Educational vs entertainment balance
- **Monetization**: Sustainable business model

### Mitigation Strategies
- **Fallback Systems**: Comprehensive backup data
- **Version Management**: Careful dependency updates
- **Performance Optimization**: Continuous monitoring and improvement
- **User Education**: Clear disclaimers and educational content

---

## Conclusion

Freedom21 represents a comprehensive wealth calculation platform that combines sophisticated financial modeling with intuitive user experience. The app's unique Bitcoin benchmark feature, advanced DCA strategies, and educational focus position it as a valuable tool for both novice and experienced investors.

The technical architecture ensures scalability, performance, and maintainability while the user experience design prioritizes clarity and education. With proper execution of the roadmap and continued focus on user value, Freedom21 has the potential to become a leading platform in the financial education and planning space.