# How to Implement Feature Flags in React Native Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Feature Flags, A/B Testing, Mobile Development, Release Management

Description: Learn how to implement feature flags in React Native for controlled rollouts, A/B testing, and safe deployments.

---

Feature flags have become an essential tool in modern software development, enabling teams to deploy code safely, run experiments, and deliver personalized experiences. In the mobile development world, where app store review processes can delay critical fixes, feature flags provide unprecedented control over your application's behavior. This comprehensive guide will walk you through implementing feature flags in React Native applications, from basic concepts to advanced patterns.

## What Are Feature Flags?

Feature flags (also known as feature toggles, feature switches, or feature gates) are a software development technique that allows you to enable or disable features without deploying new code. They act as conditional statements in your code that determine whether a particular feature should be visible or active for a given user.

```typescript
// Basic concept of a feature flag
if (featureFlags.isEnabled('new-checkout-flow')) {
  return <NewCheckoutFlow />;
} else {
  return <LegacyCheckoutFlow />;
}
```

At their core, feature flags decouple deployment from release. You can deploy code to production with features hidden behind flags, then gradually enable them for specific users or user segments without requiring a new app store submission.

### Types of Feature Flags

Understanding the different types of feature flags helps you choose the right approach for each use case:

**Release Flags**: Control the rollout of new features. These are typically short-lived and removed once the feature is fully released.

**Experiment Flags**: Enable A/B testing and experimentation. They help you measure the impact of changes on user behavior.

**Operational Flags**: Provide runtime control over system behavior, such as enabling maintenance mode or toggling performance-intensive features.

**Permission Flags**: Control access to features based on user attributes like subscription tier or role.

## Benefits of Feature Flags for Mobile Apps

Mobile applications face unique challenges that make feature flags particularly valuable:

### 1. Bypassing App Store Review Delays

When you discover a critical bug in production, you cannot simply push a hotfix like you would with a web application. App store reviews can take hours to days. With feature flags, you can instantly disable problematic features or roll back to previous implementations.

```typescript
// Emergency kill switch for a buggy feature
const PaymentScreen: React.FC = () => {
  const { isEnabled } = useFeatureFlags();

  if (!isEnabled('payment-v2-enabled')) {
    // Fall back to stable implementation
    return <PaymentScreenV1 />;
  }

  return <PaymentScreenV2 />;
};
```

### 2. Gradual Rollouts

Instead of releasing a feature to all users simultaneously, you can gradually increase the percentage of users who see the new feature. This approach limits the blast radius of potential issues.

### 3. User Segmentation and Personalization

Feature flags enable you to show different experiences to different user segments based on attributes like location, device type, subscription status, or behavior patterns.

### 4. Trunk-Based Development

Feature flags support trunk-based development by allowing developers to merge incomplete features to the main branch behind flags, reducing merge conflicts and enabling continuous integration.

### 5. A/B Testing and Experimentation

Run controlled experiments to measure the impact of changes on key metrics before committing to a full rollout.

## Feature Flag Services Overview

Several services provide feature flag management for React Native applications. Here is an overview of popular options:

### LaunchDarkly

LaunchDarkly is a feature management platform offering real-time flag updates, sophisticated targeting rules, and comprehensive SDKs. It provides excellent React Native support with their JavaScript SDK.

**Pros:**
- Real-time flag updates via streaming
- Advanced targeting and segmentation
- Excellent documentation and support
- Built-in experimentation features

**Cons:**
- Higher pricing for smaller teams
- Requires third-party dependency

### Firebase Remote Config

Part of the Firebase suite, Remote Config provides a free tier with generous limits. It integrates well with other Firebase services and offers good React Native support.

**Pros:**
- Free tier with generous limits
- Integrates with Firebase Analytics for A/B testing
- Familiar for teams already using Firebase
- Offline support with caching

**Cons:**
- Less sophisticated targeting than dedicated platforms
- Requires Firebase setup
- Update latency can be higher

### Flagsmith

An open-source feature flag service that can be self-hosted or used as a cloud service. Good option for teams wanting control over their data.

### ConfigCat

A simple and affordable feature flag service with good SDK support and straightforward pricing.

### Custom Solutions

For specific requirements or to avoid external dependencies, you can build your own feature flag system using your backend API.

## LaunchDarkly Integration

Let us implement LaunchDarkly in a React Native application step by step.

### Installation

```bash
npm install launchdarkly-react-native-client-sdk
# or
yarn add launchdarkly-react-native-client-sdk
```

For iOS, install the pods:

```bash
cd ios && pod install
```

### Configuration

Create a configuration file to manage your LaunchDarkly setup:

```typescript
// src/config/featureFlags.ts
import LDClient, {
  LDConfig,
  LDContext,
} from 'launchdarkly-react-native-client-sdk';

const LAUNCHDARKLY_MOBILE_KEY = 'your-mobile-key';

export const ldConfig: LDConfig = {
  mobileKey: LAUNCHDARKLY_MOBILE_KEY,
  debugMode: __DEV__,
  connectionTimeoutMillis: 10000,
  backgroundPollingIntervalMillis: 3600000, // 1 hour
  disableBackgroundUpdating: false,
};

export const createLDContext = (user: User): LDContext => ({
  kind: 'user',
  key: user.id,
  email: user.email,
  name: user.name,
  custom: {
    subscriptionTier: user.subscriptionTier,
    accountAge: user.accountAgeDays,
    platform: Platform.OS,
    appVersion: getAppVersion(),
  },
});

let ldClientInstance: LDClient | null = null;

export const initializeLaunchDarkly = async (user: User): Promise<void> => {
  const context = createLDContext(user);

  ldClientInstance = new LDClient();
  await ldClientInstance.configure(ldConfig, context);
};

export const getLDClient = (): LDClient => {
  if (!ldClientInstance) {
    throw new Error('LaunchDarkly client not initialized');
  }
  return ldClientInstance;
};
```

### Creating a Feature Flag Provider

Wrap your application with a provider that manages flag state:

```typescript
// src/providers/FeatureFlagProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import LDClient from 'launchdarkly-react-native-client-sdk';
import { initializeLaunchDarkly, getLDClient } from '../config/featureFlags';

interface FeatureFlagContextValue {
  isInitialized: boolean;
  isEnabled: (flagKey: string, defaultValue?: boolean) => boolean;
  getVariation: <T>(flagKey: string, defaultValue: T) => T;
  getAllFlags: () => Record<string, unknown>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

interface FeatureFlagProviderProps {
  children: ReactNode;
  user: User;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  user,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [flagValues, setFlagValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeLaunchDarkly(user);
        const client = getLDClient();

        // Get all flag values
        const allFlags = await client.allFlags();
        setFlagValues(allFlags);
        setIsInitialized(true);

        // Listen for flag changes
        client.registerAllFlagsListener('all-flags-listener', (updatedFlags) => {
          setFlagValues((prev) => ({ ...prev, ...updatedFlags }));
        });
      } catch (error) {
        console.error('Failed to initialize feature flags:', error);
        setIsInitialized(true); // Continue with defaults
      }
    };

    initialize();

    return () => {
      const client = getLDClient();
      client?.unregisterAllFlagsListener('all-flags-listener');
      client?.close();
    };
  }, [user]);

  const isEnabled = useCallback(
    (flagKey: string, defaultValue = false): boolean => {
      if (!isInitialized) return defaultValue;
      return Boolean(flagValues[flagKey] ?? defaultValue);
    },
    [isInitialized, flagValues]
  );

  const getVariation = useCallback(
    <T,>(flagKey: string, defaultValue: T): T => {
      if (!isInitialized) return defaultValue;
      return (flagValues[flagKey] as T) ?? defaultValue;
    },
    [isInitialized, flagValues]
  );

  const getAllFlags = useCallback(
    () => ({ ...flagValues }),
    [flagValues]
  );

  return (
    <FeatureFlagContext.Provider
      value={{ isInitialized, isEnabled, getVariation, getAllFlags }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = (): FeatureFlagContextValue => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
};
```

### Using Feature Flags in Components

```typescript
// src/components/FeatureGate.tsx
import React, { ReactNode } from 'react';
import { useFeatureFlags } from '../providers/FeatureFlagProvider';

interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  flag,
  children,
  fallback = null,
}) => {
  const { isEnabled, isInitialized } = useFeatureFlags();

  if (!isInitialized) {
    return null; // Or a loading state
  }

  return isEnabled(flag) ? <>{children}</> : <>{fallback}</>;
};

// Usage example
const HomeScreen: React.FC = () => {
  return (
    <View>
      <Header />

      <FeatureGate flag="new-dashboard-widget">
        <NewDashboardWidget />
      </FeatureGate>

      <FeatureGate
        flag="premium-features"
        fallback={<UpgradePrompt />}
      >
        <PremiumContent />
      </FeatureGate>
    </View>
  );
};
```

## Firebase Remote Config

Firebase Remote Config offers a cost-effective alternative with good React Native support.

### Installation

```bash
npm install @react-native-firebase/app @react-native-firebase/remote-config
# or
yarn add @react-native-firebase/app @react-native-firebase/remote-config
```

### Configuration

```typescript
// src/config/firebaseRemoteConfig.ts
import remoteConfig from '@react-native-firebase/remote-config';

// Default values for all feature flags
const defaultFlags: Record<string, string | number | boolean> = {
  new_onboarding_flow: false,
  checkout_v2_enabled: false,
  max_cart_items: 10,
  welcome_message: 'Welcome to our app!',
  feature_announcement_banner: JSON.stringify({
    enabled: false,
    message: '',
    action: null,
  }),
};

export const initializeRemoteConfig = async (): Promise<void> => {
  await remoteConfig().setDefaults(defaultFlags);

  // Set minimum fetch interval (for development, use 0)
  await remoteConfig().setConfigSettings({
    minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000, // 1 hour in production
  });

  // Fetch and activate
  await remoteConfig().fetchAndActivate();
};

export const getRemoteConfigValue = <T>(key: string): T => {
  const value = remoteConfig().getValue(key);

  // Handle different value types
  if (typeof defaultFlags[key] === 'boolean') {
    return value.asBoolean() as T;
  }
  if (typeof defaultFlags[key] === 'number') {
    return value.asNumber() as T;
  }
  return value.asString() as T;
};

export const getAllRemoteConfigValues = (): Record<string, unknown> => {
  const allValues = remoteConfig().getAll();
  const result: Record<string, unknown> = {};

  Object.keys(allValues).forEach((key) => {
    const value = allValues[key];
    if (typeof defaultFlags[key] === 'boolean') {
      result[key] = value.asBoolean();
    } else if (typeof defaultFlags[key] === 'number') {
      result[key] = value.asNumber();
    } else {
      result[key] = value.asString();
    }
  });

  return result;
};
```

### Firebase Remote Config Provider

```typescript
// src/providers/FirebaseFeatureFlagProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import remoteConfig from '@react-native-firebase/remote-config';
import {
  initializeRemoteConfig,
  getRemoteConfigValue,
  getAllRemoteConfigValues,
} from '../config/firebaseRemoteConfig';

interface FirebaseFlagContextValue {
  isInitialized: boolean;
  isEnabled: (key: string) => boolean;
  getValue: <T>(key: string) => T;
  getJsonValue: <T>(key: string) => T | null;
  refresh: () => Promise<void>;
}

const FirebaseFlagContext = createContext<FirebaseFlagContextValue | null>(null);

export const FirebaseFeatureFlagProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setUpdateTrigger] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeRemoteConfig();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Remote Config:', error);
        setIsInitialized(true); // Continue with defaults
      }
    };

    initialize();

    // Listen for config updates when app is in foreground
    const unsubscribe = remoteConfig().onConfigUpdated(async () => {
      await remoteConfig().activate();
      setUpdateTrigger((prev) => prev + 1);
    });

    return () => unsubscribe();
  }, []);

  const isEnabled = useCallback((key: string): boolean => {
    return getRemoteConfigValue<boolean>(key);
  }, []);

  const getValue = useCallback(<T,>(key: string): T => {
    return getRemoteConfigValue<T>(key);
  }, []);

  const getJsonValue = useCallback(<T,>(key: string): T | null => {
    try {
      const stringValue = getRemoteConfigValue<string>(key);
      return JSON.parse(stringValue) as T;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await remoteConfig().fetchAndActivate();
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  return (
    <FirebaseFlagContext.Provider
      value={{ isInitialized, isEnabled, getValue, getJsonValue, refresh }}
    >
      {children}
    </FirebaseFlagContext.Provider>
  );
};

export const useFirebaseFlags = (): FirebaseFlagContextValue => {
  const context = useContext(FirebaseFlagContext);
  if (!context) {
    throw new Error(
      'useFirebaseFlags must be used within FirebaseFeatureFlagProvider'
    );
  }
  return context;
};
```

## Building a Custom Flag System

For teams that prefer to avoid external dependencies or have specific requirements, building a custom feature flag system is straightforward.

### Backend API Design

First, design your API endpoint:

```typescript
// API Response Structure
interface FeatureFlagResponse {
  flags: {
    [key: string]: {
      enabled: boolean;
      value?: unknown;
      variant?: string;
    };
  };
  evaluatedAt: string;
  ttlSeconds: number;
}

// Example response
{
  "flags": {
    "new-checkout": {
      "enabled": true,
      "variant": "variant-a"
    },
    "premium-features": {
      "enabled": false
    },
    "max-upload-size": {
      "enabled": true,
      "value": 50
    }
  },
  "evaluatedAt": "2026-01-15T10:30:00Z",
  "ttlSeconds": 300
}
```

### Custom Feature Flag Service

```typescript
// src/services/CustomFeatureFlagService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FlagValue {
  enabled: boolean;
  value?: unknown;
  variant?: string;
}

interface CachedFlags {
  flags: Record<string, FlagValue>;
  expiresAt: number;
}

const CACHE_KEY = '@feature_flags_cache';
const DEFAULT_TTL_MS = 300000; // 5 minutes

class CustomFeatureFlagService {
  private flags: Record<string, FlagValue> = {};
  private defaultFlags: Record<string, FlagValue> = {};
  private apiUrl: string;
  private isInitialized = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(flags: Record<string, FlagValue>) => void> = new Set();

  constructor(apiUrl: string, defaults: Record<string, FlagValue>) {
    this.apiUrl = apiUrl;
    this.defaultFlags = defaults;
    this.flags = { ...defaults };
  }

  async initialize(userContext: Record<string, unknown>): Promise<void> {
    // Load cached flags first for instant startup
    await this.loadFromCache();

    // Then fetch fresh flags
    await this.fetchFlags(userContext);

    this.isInitialized = true;

    // Set up periodic refresh
    this.startPeriodicRefresh(userContext);
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache: CachedFlags = JSON.parse(cached);
        if (parsedCache.expiresAt > Date.now()) {
          this.flags = { ...this.defaultFlags, ...parsedCache.flags };
        }
      }
    } catch (error) {
      console.warn('Failed to load cached flags:', error);
    }
  }

  private async saveToCache(flags: Record<string, FlagValue>, ttlMs: number): Promise<void> {
    try {
      const cacheData: CachedFlags = {
        flags,
        expiresAt: Date.now() + ttlMs,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache flags:', error);
    }
  }

  private async fetchFlags(userContext: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: userContext }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      this.flags = { ...this.defaultFlags, ...data.flags };

      await this.saveToCache(data.flags, (data.ttlSeconds || 300) * 1000);

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
      // Continue with cached or default values
    }
  }

  private startPeriodicRefresh(userContext: Record<string, unknown>): void {
    this.refreshTimer = setInterval(() => {
      this.fetchFlags(userContext);
    }, DEFAULT_TTL_MS);
  }

  stopPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  isEnabled(flagKey: string): boolean {
    return this.flags[flagKey]?.enabled ?? this.defaultFlags[flagKey]?.enabled ?? false;
  }

  getValue<T>(flagKey: string): T | undefined {
    return this.flags[flagKey]?.value as T;
  }

  getVariant(flagKey: string): string | undefined {
    return this.flags[flagKey]?.variant;
  }

  getAllFlags(): Record<string, FlagValue> {
    return { ...this.flags };
  }

  subscribe(listener: (flags: Record<string, FlagValue>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.flags));
  }
}

export const featureFlagService = new CustomFeatureFlagService(
  'https://api.yourapp.com/v1/feature-flags',
  {
    'new-checkout': { enabled: false },
    'premium-features': { enabled: false },
    'dark-mode': { enabled: true },
  }
);
```

## Flag Evaluation Patterns

Implementing clean and maintainable flag evaluation patterns is crucial for long-term code health.

### Hook-Based Pattern

```typescript
// src/hooks/useFeature.ts
import { useMemo } from 'react';
import { useFeatureFlags } from '../providers/FeatureFlagProvider';

interface UseFeatureResult<T> {
  isEnabled: boolean;
  value: T | undefined;
  variant: string | undefined;
}

export function useFeature<T = unknown>(flagKey: string): UseFeatureResult<T> {
  const { isEnabled, getVariation } = useFeatureFlags();

  return useMemo(
    () => ({
      isEnabled: isEnabled(flagKey),
      value: getVariation<T | undefined>(flagKey, undefined),
      variant: getVariation<string | undefined>(`${flagKey}_variant`, undefined),
    }),
    [flagKey, isEnabled, getVariation]
  );
}

// Usage
const CheckoutScreen: React.FC = () => {
  const newCheckout = useFeature('new-checkout-flow');

  if (newCheckout.isEnabled) {
    return <NewCheckoutFlow variant={newCheckout.variant} />;
  }

  return <LegacyCheckoutFlow />;
};
```

### Higher-Order Component Pattern

```typescript
// src/hocs/withFeatureFlag.tsx
import React, { ComponentType } from 'react';
import { useFeatureFlags } from '../providers/FeatureFlagProvider';

interface WithFeatureFlagOptions {
  flag: string;
  FallbackComponent?: ComponentType;
  LoadingComponent?: ComponentType;
}

export function withFeatureFlag<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithFeatureFlagOptions
): ComponentType<P> {
  const { flag, FallbackComponent, LoadingComponent } = options;

  const WithFeatureFlagComponent: React.FC<P> = (props) => {
    const { isEnabled, isInitialized } = useFeatureFlags();

    if (!isInitialized && LoadingComponent) {
      return <LoadingComponent />;
    }

    if (!isEnabled(flag)) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <WrappedComponent {...props} />;
  };

  WithFeatureFlagComponent.displayName = `withFeatureFlag(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithFeatureFlagComponent;
}

// Usage
const NewFeatureScreen = withFeatureFlag(NewFeatureScreenBase, {
  flag: 'new-feature-screen',
  FallbackComponent: LegacyFeatureScreen,
  LoadingComponent: LoadingSpinner,
});
```

### Render Props Pattern

```typescript
// src/components/Feature.tsx
import React, { ReactNode } from 'react';
import { useFeatureFlags } from '../providers/FeatureFlagProvider';

interface FeatureProps {
  flag: string;
  children: (props: { isEnabled: boolean; variant?: string }) => ReactNode;
}

export const Feature: React.FC<FeatureProps> = ({ flag, children }) => {
  const { isEnabled, getVariation } = useFeatureFlags();

  return (
    <>
      {children({
        isEnabled: isEnabled(flag),
        variant: getVariation<string>(`${flag}_variant`, ''),
      })}
    </>
  );
};

// Usage
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <Feature flag="enhanced-product-card">
      {({ isEnabled, variant }) => (
        <View style={styles.card}>
          {isEnabled && variant === 'with-reviews' && (
            <ProductReviews productId={product.id} />
          )}
          <ProductDetails product={product} />
          {isEnabled && <QuickAddToCart product={product} />}
        </View>
      )}
    </Feature>
  );
};
```

## A/B Testing with Flags

Feature flags provide a foundation for A/B testing. Here is how to implement proper experimentation:

```typescript
// src/services/ExperimentService.ts
import analytics from '@react-native-firebase/analytics';

interface Experiment {
  name: string;
  variants: string[];
  metrics: string[];
}

interface ExperimentAssignment {
  experimentName: string;
  variant: string;
  assignedAt: Date;
}

class ExperimentService {
  private assignments: Map<string, ExperimentAssignment> = new Map();

  recordExposure(experimentName: string, variant: string): void {
    // Track that the user was exposed to this experiment variant
    analytics().logEvent('experiment_exposure', {
      experiment_name: experimentName,
      variant,
      timestamp: new Date().toISOString(),
    });

    this.assignments.set(experimentName, {
      experimentName,
      variant,
      assignedAt: new Date(),
    });
  }

  trackConversion(
    experimentName: string,
    metricName: string,
    value?: number
  ): void {
    const assignment = this.assignments.get(experimentName);
    if (!assignment) {
      console.warn(`No assignment found for experiment: ${experimentName}`);
      return;
    }

    analytics().logEvent('experiment_conversion', {
      experiment_name: experimentName,
      variant: assignment.variant,
      metric_name: metricName,
      value: value ?? 1,
      timestamp: new Date().toISOString(),
    });
  }
}

export const experimentService = new ExperimentService();

// Usage in components
const CheckoutButton: React.FC = () => {
  const { getVariation } = useFeatureFlags();
  const variant = getVariation<string>('checkout-button-experiment', 'control');

  useEffect(() => {
    experimentService.recordExposure('checkout-button-experiment', variant);
  }, [variant]);

  const handlePress = () => {
    experimentService.trackConversion(
      'checkout-button-experiment',
      'checkout_started'
    );
    navigation.navigate('Checkout');
  };

  return (
    <Button
      title={variant === 'variant-a' ? 'Buy Now' : 'Add to Cart'}
      color={variant === 'variant-b' ? '#FF6B00' : '#007AFF'}
      onPress={handlePress}
    />
  );
};
```

### Statistical Significance Considerations

When running A/B tests, ensure you have sufficient sample sizes:

```typescript
// src/utils/experimentUtils.ts
export const calculateSampleSize = (
  baselineConversionRate: number,
  minimumDetectableEffect: number,
  statisticalPower: number = 0.8,
  significanceLevel: number = 0.05
): number => {
  // Simplified sample size calculation
  const z_alpha = 1.96; // for 95% confidence
  const z_beta = 0.84; // for 80% power

  const p1 = baselineConversionRate;
  const p2 = baselineConversionRate * (1 + minimumDetectableEffect);
  const pooledP = (p1 + p2) / 2;

  const numerator = Math.pow(z_alpha + z_beta, 2) * 2 * pooledP * (1 - pooledP);
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
};

// Example: If baseline conversion is 10% and you want to detect a 20% lift
// calculateSampleSize(0.10, 0.20) => ~3,920 users per variant
```

## Gradual Rollouts

Implement percentage-based rollouts to safely release features:

```typescript
// src/utils/rolloutUtils.ts
import { createHash } from 'crypto';

export const isUserInRollout = (
  userId: string,
  flagKey: string,
  percentage: number
): boolean => {
  // Create a deterministic hash based on user ID and flag key
  // This ensures the same user always gets the same result for a given flag
  const hashInput = `${userId}:${flagKey}`;
  const hash = createHash('md5').update(hashInput).digest('hex');

  // Convert first 8 characters of hash to a number between 0-100
  const hashValue = parseInt(hash.substring(0, 8), 16);
  const normalizedValue = (hashValue % 10000) / 100;

  return normalizedValue < percentage;
};

// Usage in feature flag evaluation
const evaluateRollout = (
  userId: string,
  flagConfig: FlagConfig
): boolean => {
  if (!flagConfig.rollout) {
    return flagConfig.enabled;
  }

  const { percentage, excludeUserIds = [], includeUserIds = [] } = flagConfig.rollout;

  // Always include these users
  if (includeUserIds.includes(userId)) {
    return true;
  }

  // Always exclude these users
  if (excludeUserIds.includes(userId)) {
    return false;
  }

  return isUserInRollout(userId, flagConfig.key, percentage);
};
```

### Progressive Rollout Strategy

```typescript
// src/config/rolloutStrategies.ts
interface RolloutStage {
  percentage: number;
  duration: number; // hours to stay at this stage
  criteria: {
    maxErrorRate?: number;
    minSampleSize?: number;
  };
}

const progressiveRolloutStages: RolloutStage[] = [
  { percentage: 1, duration: 24, criteria: { maxErrorRate: 0.01, minSampleSize: 100 } },
  { percentage: 5, duration: 24, criteria: { maxErrorRate: 0.01, minSampleSize: 500 } },
  { percentage: 25, duration: 48, criteria: { maxErrorRate: 0.005, minSampleSize: 2500 } },
  { percentage: 50, duration: 48, criteria: { maxErrorRate: 0.005, minSampleSize: 5000 } },
  { percentage: 100, duration: 0, criteria: {} },
];
```

## User Targeting

Implement sophisticated user targeting for personalized experiences:

```typescript
// src/services/TargetingService.ts
interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: unknown;
}

interface TargetingCondition {
  rules: TargetingRule[];
  matchType: 'all' | 'any';
}

interface TargetedFlag {
  key: string;
  defaultValue: boolean;
  targeting: {
    conditions: TargetingCondition[];
    valueWhenMatched: boolean;
  }[];
}

export class TargetingService {
  evaluateRule(rule: TargetingRule, userContext: Record<string, unknown>): boolean {
    const userValue = userContext[rule.attribute];

    switch (rule.operator) {
      case 'equals':
        return userValue === rule.value;
      case 'notEquals':
        return userValue !== rule.value;
      case 'contains':
        return String(userValue).includes(String(rule.value));
      case 'greaterThan':
        return Number(userValue) > Number(rule.value);
      case 'lessThan':
        return Number(userValue) < Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(userValue);
      case 'notIn':
        return Array.isArray(rule.value) && !rule.value.includes(userValue);
      default:
        return false;
    }
  }

  evaluateCondition(
    condition: TargetingCondition,
    userContext: Record<string, unknown>
  ): boolean {
    const results = condition.rules.map((rule) =>
      this.evaluateRule(rule, userContext)
    );

    return condition.matchType === 'all'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  evaluateFlag(flag: TargetedFlag, userContext: Record<string, unknown>): boolean {
    for (const targeting of flag.targeting) {
      const matches = targeting.conditions.every((condition) =>
        this.evaluateCondition(condition, userContext)
      );

      if (matches) {
        return targeting.valueWhenMatched;
      }
    }

    return flag.defaultValue;
  }
}

// Example flag configuration
const betaFeaturesFlag: TargetedFlag = {
  key: 'beta-features',
  defaultValue: false,
  targeting: [
    {
      conditions: [
        {
          matchType: 'all',
          rules: [
            { attribute: 'subscriptionTier', operator: 'equals', value: 'premium' },
            { attribute: 'accountAgeDays', operator: 'greaterThan', value: 30 },
          ],
        },
      ],
      valueWhenMatched: true,
    },
    {
      conditions: [
        {
          matchType: 'any',
          rules: [
            { attribute: 'email', operator: 'contains', value: '@yourcompany.com' },
            { attribute: 'userId', operator: 'in', value: ['beta-tester-1', 'beta-tester-2'] },
          ],
        },
      ],
      valueWhenMatched: true,
    },
  ],
};
```

## Flag Lifecycle Management

Proper flag lifecycle management prevents technical debt accumulation:

```typescript
// src/utils/flagLifecycle.ts
interface FlagMetadata {
  key: string;
  createdAt: Date;
  createdBy: string;
  type: 'release' | 'experiment' | 'operational' | 'permission';
  expectedRemovalDate?: Date;
  jiraTicket?: string;
  description: string;
}

// Document all flags in a central registry
export const flagRegistry: Record<string, FlagMetadata> = {
  'new-checkout-flow': {
    key: 'new-checkout-flow',
    createdAt: new Date('2026-01-01'),
    createdBy: 'dev@company.com',
    type: 'release',
    expectedRemovalDate: new Date('2026-03-01'),
    jiraTicket: 'PROJ-1234',
    description: 'New streamlined checkout flow with fewer steps',
  },
  'checkout-experiment': {
    key: 'checkout-experiment',
    createdAt: new Date('2026-01-10'),
    createdBy: 'product@company.com',
    type: 'experiment',
    expectedRemovalDate: new Date('2026-02-10'),
    jiraTicket: 'PROJ-1250',
    description: 'A/B test for checkout button copy',
  },
};

// Script to check for stale flags
export const checkForStaleFlags = (): FlagMetadata[] => {
  const now = new Date();
  const staleFlags: FlagMetadata[] = [];

  Object.values(flagRegistry).forEach((flag) => {
    if (flag.expectedRemovalDate && flag.expectedRemovalDate < now) {
      staleFlags.push(flag);
    }
  });

  return staleFlags;
};

// ESLint rule configuration for flag cleanup reminders
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: "Literal[value='deprecated-flag-name']",
        message: 'This feature flag is scheduled for removal. Please clean up.',
      },
    ],
  },
};
```

### Flag Cleanup Workflow

```typescript
// scripts/cleanupFlags.ts
import { flagRegistry, checkForStaleFlags } from '../src/utils/flagLifecycle';

const cleanupReport = async () => {
  const staleFlags = checkForStaleFlags();

  if (staleFlags.length === 0) {
    console.log('No stale flags found.');
    return;
  }

  console.log('Stale flags requiring cleanup:');
  console.log('=============================');

  staleFlags.forEach((flag) => {
    console.log(`
Flag: ${flag.key}
Type: ${flag.type}
Created: ${flag.createdAt.toISOString()}
Expected Removal: ${flag.expectedRemovalDate?.toISOString()}
Ticket: ${flag.jiraTicket || 'N/A'}
Description: ${flag.description}
    `);
  });
};

cleanupReport();
```

## Testing with Feature Flags

Proper testing strategies ensure your feature flags work correctly:

```typescript
// src/testing/featureFlagTestUtils.ts
import React, { ReactNode } from 'react';
import { FeatureFlagContext } from '../providers/FeatureFlagProvider';

interface MockFlagConfig {
  [key: string]: boolean | unknown;
}

interface MockFeatureFlagProviderProps {
  children: ReactNode;
  flags: MockFlagConfig;
}

export const MockFeatureFlagProvider: React.FC<MockFeatureFlagProviderProps> = ({
  children,
  flags,
}) => {
  const mockValue = {
    isInitialized: true,
    isEnabled: (flagKey: string, defaultValue = false) =>
      Boolean(flags[flagKey] ?? defaultValue),
    getVariation: <T,>(flagKey: string, defaultValue: T) =>
      (flags[flagKey] as T) ?? defaultValue,
    getAllFlags: () => flags,
  };

  return (
    <FeatureFlagContext.Provider value={mockValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Test helper for setting up flag states
export const createFlagTestHelper = () => {
  let mockFlags: MockFlagConfig = {};

  return {
    setFlag: (key: string, value: boolean | unknown) => {
      mockFlags[key] = value;
    },
    clearFlags: () => {
      mockFlags = {};
    },
    getFlags: () => ({ ...mockFlags }),
    wrapper: ({ children }: { children: ReactNode }) => (
      <MockFeatureFlagProvider flags={mockFlags}>
        {children}
      </MockFeatureFlagProvider>
    ),
  };
};
```

### Unit Testing Components with Flags

```typescript
// __tests__/CheckoutScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CheckoutScreen } from '../src/screens/CheckoutScreen';
import { MockFeatureFlagProvider } from '../src/testing/featureFlagTestUtils';

describe('CheckoutScreen', () => {
  it('renders new checkout flow when flag is enabled', () => {
    const { getByTestId } = render(
      <MockFeatureFlagProvider flags={{ 'new-checkout-flow': true }}>
        <CheckoutScreen />
      </MockFeatureFlagProvider>
    );

    expect(getByTestId('new-checkout-container')).toBeTruthy();
  });

  it('renders legacy checkout when flag is disabled', () => {
    const { getByTestId } = render(
      <MockFeatureFlagProvider flags={{ 'new-checkout-flow': false }}>
        <CheckoutScreen />
      </MockFeatureFlagProvider>
    );

    expect(getByTestId('legacy-checkout-container')).toBeTruthy();
  });

  it('handles missing flag gracefully with default value', () => {
    const { getByTestId } = render(
      <MockFeatureFlagProvider flags={{}}>
        <CheckoutScreen />
      </MockFeatureFlagProvider>
    );

    // Should fall back to legacy (default false)
    expect(getByTestId('legacy-checkout-container')).toBeTruthy();
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/featureFlags.test.ts
import { featureFlagService } from '../../src/services/CustomFeatureFlagService';

describe('Feature Flag Service Integration', () => {
  beforeEach(async () => {
    await featureFlagService.initialize({
      userId: 'test-user-123',
      email: 'test@example.com',
    });
  });

  afterEach(() => {
    featureFlagService.stopPeriodicRefresh();
  });

  it('fetches flags from the API', async () => {
    // Note: This test requires a test API endpoint or mock server
    const flags = featureFlagService.getAllFlags();
    expect(flags).toBeDefined();
  });

  it('returns default value when flag is not found', () => {
    const isEnabled = featureFlagService.isEnabled('non-existent-flag');
    expect(isEnabled).toBe(false);
  });

  it('notifies subscribers when flags update', (done) => {
    const unsubscribe = featureFlagService.subscribe((flags) => {
      expect(flags).toBeDefined();
      unsubscribe();
      done();
    });

    // Trigger a refresh
    featureFlagService.refresh();
  });
});
```

### E2E Testing Considerations

```typescript
// e2e/featureFlags.e2e.ts
import { device, element, by, expect } from 'detox';

describe('Feature Flags E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        // Override feature flags for testing
        featureFlags: JSON.stringify({
          'new-checkout-flow': true,
          'premium-features': true,
        }),
      },
    });
  });

  it('should display new checkout flow when flag is enabled', async () => {
    await element(by.id('shop-tab')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('checkout-button')).tap();

    await expect(element(by.id('new-checkout-container'))).toBeVisible();
  });
});
```

## Best Practices Summary

1. **Start Simple**: Begin with basic boolean flags before implementing complex targeting rules.

2. **Use Meaningful Names**: Choose descriptive flag names like `new-checkout-flow-v2` rather than `feature-1`.

3. **Document Everything**: Maintain a registry of all flags with ownership, purpose, and expected removal dates.

4. **Set Expiration Dates**: Every release flag should have an expected removal date to prevent accumulation.

5. **Test Both States**: Always test your application with flags both enabled and disabled.

6. **Monitor Flag Usage**: Track which flags are being evaluated and their states in production.

7. **Implement Kill Switches**: Have the ability to quickly disable features in emergencies.

8. **Cache Wisely**: Balance between fresh flag values and offline functionality.

9. **Clean Up Regularly**: Schedule regular flag cleanup sessions to remove stale flags.

10. **Start with Safe Defaults**: Default values should represent the safest, most stable behavior.

## Conclusion

Feature flags are a powerful tool for React Native developers, enabling safer deployments, controlled rollouts, and data-driven experimentation. Whether you choose a managed service like LaunchDarkly, leverage Firebase Remote Config, or build a custom solution, the principles remain the same: decouple deployment from release, measure impact, and maintain clean code through proper lifecycle management.

By implementing the patterns and practices covered in this guide, you will be well-equipped to use feature flags effectively in your React Native applications, delivering better experiences to your users while maintaining the confidence to ship frequently and safely.

Remember that feature flags are not just a technical implementation but a cultural shift toward experimentation and data-driven decision-making. Start small, measure everything, and iterate based on what you learn.
