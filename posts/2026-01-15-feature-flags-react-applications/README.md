# How to Implement Feature Flags in React Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Feature Flags, A/B Testing, DevOps, Release Management, Frontend

Description: A comprehensive guide to implementing feature flags in React applications, covering patterns from simple boolean toggles to advanced context-based systems with remote configuration.

---

## What Are Feature Flags and Why Do They Matter?

Feature flags (also known as feature toggles, feature switches, or feature flippers) are a software development technique that allows you to enable or disable functionality without deploying new code. They create a layer of abstraction between your code and the features it exposes to users.

Consider this scenario: Your team has been working on a new checkout flow for three months. The old approach would be to merge everything at once, deploy, and hope nothing breaks. With feature flags, you can:

1. Deploy the code behind a flag (disabled by default)
2. Enable it for internal testing
3. Roll it out to 5% of users
4. Monitor performance and error rates
5. Gradually increase to 100% or rollback instantly

No emergency deploys. No 2 AM rollbacks. No customer-facing outages.

## The Business Case for Feature Flags

Before diving into implementation, let's understand why engineering teams invest in feature flag infrastructure:

**Risk Reduction**
- Decouple deployment from release
- Instant rollback without code changes
- Reduce blast radius of bugs to a subset of users

**Developer Velocity**
- Merge incomplete features to main branch safely
- Remove long-lived feature branches
- Enable trunk-based development

**Product Experimentation**
- A/B testing without separate deployments
- Gradual rollouts based on user segments
- Data-driven feature decisions

**Operational Control**
- Kill switches for expensive operations
- Graceful degradation during incidents
- Load shedding capabilities

---

## Feature Flag Patterns in React

There are several patterns for implementing feature flags, ranging from simple to sophisticated. We'll explore each one with practical examples.

### Pattern 1: Simple Boolean Flags

The most basic approach uses environment variables or a simple configuration object.

```typescript
// config/featureFlags.ts
export const featureFlags = {
  newDashboard: process.env.REACT_APP_NEW_DASHBOARD === 'true',
  darkMode: process.env.REACT_APP_DARK_MODE === 'true',
  betaFeatures: process.env.REACT_APP_BETA_FEATURES === 'true',
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
```

Usage in components:

```tsx
// components/Dashboard.tsx
import { featureFlags } from '../config/featureFlags';

export const Dashboard: React.FC = () => {
  if (featureFlags.newDashboard) {
    return <NewDashboard />;
  }
  return <LegacyDashboard />;
};
```

**Pros:**
- Zero runtime overhead
- Dead code elimination during build
- Simple to understand

**Cons:**
- Requires rebuild to change flags
- No per-user targeting
- No gradual rollouts

### Pattern 2: Runtime Configuration Object

For more flexibility, load flags at runtime from an API or configuration service.

```typescript
// types/featureFlags.ts
export interface FeatureFlags {
  newCheckoutFlow: boolean;
  socialLogin: boolean;
  aiRecommendations: boolean;
  maxUploadSize: number;
  allowedFileTypes: string[];
}

export const defaultFlags: FeatureFlags = {
  newCheckoutFlow: false,
  socialLogin: false,
  aiRecommendations: false,
  maxUploadSize: 10485760, // 10MB
  allowedFileTypes: ['jpg', 'png', 'pdf'],
};
```

```typescript
// services/featureFlagService.ts
import { FeatureFlags, defaultFlags } from '../types/featureFlags';

class FeatureFlagService {
  private flags: FeatureFlags = defaultFlags;
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      const response = await fetch('/api/feature-flags');
      if (response.ok) {
        const remoteFlags = await response.json();
        this.flags = { ...defaultFlags, ...remoteFlags };
      }
    } catch (error) {
      console.warn('Failed to fetch feature flags, using defaults:', error);
    }
    this.initialized = true;
  }

  isEnabled(flagName: keyof FeatureFlags): boolean {
    if (!this.initialized) {
      console.warn('Feature flags not initialized, using default value');
    }
    const value = this.flags[flagName];
    return typeof value === 'boolean' ? value : false;
  }

  getValue<K extends keyof FeatureFlags>(flagName: K): FeatureFlags[K] {
    return this.flags[flagName];
  }

  getAllFlags(): Readonly<FeatureFlags> {
    return { ...this.flags };
  }
}

export const featureFlagService = new FeatureFlagService();
```

### Pattern 3: React Context-Based Feature Flags

The context pattern is the most React-idiomatic approach for feature flags. It provides:
- Centralized flag management
- Automatic re-renders when flags change
- Easy testing through context providers
- Type safety throughout the application

```typescript
// context/FeatureFlagContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// Define all feature flags with their types
export interface FeatureFlags {
  // Boolean flags
  newNavigation: boolean;
  advancedSearch: boolean;
  realTimeUpdates: boolean;
  darkModeToggle: boolean;

  // Percentage rollout flags (0-100)
  newPricingPage: number;
  experimentalEditor: number;

  // String variant flags (for A/B tests)
  checkoutVariant: 'control' | 'variant-a' | 'variant-b';
  onboardingFlow: 'standard' | 'simplified' | 'guided';
}

export const defaultFeatureFlags: FeatureFlags = {
  newNavigation: false,
  advancedSearch: false,
  realTimeUpdates: false,
  darkModeToggle: true,
  newPricingPage: 0,
  experimentalEditor: 0,
  checkoutVariant: 'control',
  onboardingFlow: 'standard',
};

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  isEnabled: (flagName: keyof FeatureFlags) => boolean;
  isEnabledForUser: (flagName: keyof FeatureFlags, userId: string) => boolean;
  getVariant: <K extends keyof FeatureFlags>(flagName: K) => FeatureFlags[K];
  refreshFlags: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(
  undefined
);

interface FeatureFlagProviderProps {
  children: ReactNode;
  apiEndpoint?: string;
  refreshInterval?: number;
  userId?: string;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  apiEndpoint = '/api/feature-flags',
  refreshInterval = 300000, // 5 minutes
  userId,
}) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const url = new URL(apiEndpoint, window.location.origin);
      if (userId) {
        url.searchParams.set('userId', userId);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const remoteFlags = await response.json();
      setFlags(prevFlags => ({ ...prevFlags, ...remoteFlags }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch feature flags:', err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, userId]);

  useEffect(() => {
    fetchFlags();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchFlags, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchFlags, refreshInterval]);

  // Simple boolean check
  const isEnabled = useCallback(
    (flagName: keyof FeatureFlags): boolean => {
      const value = flags[flagName];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        return value === 100;
      }
      return value !== 'control';
    },
    [flags]
  );

  // Percentage-based check using userId for consistent bucketing
  const isEnabledForUser = useCallback(
    (flagName: keyof FeatureFlags, targetUserId: string): boolean => {
      const value = flags[flagName];

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'number') {
        // Consistent hashing based on flag name + user ID
        const hash = hashString(`${flagName}-${targetUserId}`);
        const bucket = hash % 100;
        return bucket < value;
      }

      return value !== 'control';
    },
    [flags]
  );

  const getVariant = useCallback(
    <K extends keyof FeatureFlags>(flagName: K): FeatureFlags[K] => {
      return flags[flagName];
    },
    [flags]
  );

  const value: FeatureFlagContextValue = {
    flags,
    isEnabled,
    isEnabledForUser,
    getVariant,
    refreshFlags: fetchFlags,
    loading,
    error,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Custom hook for consuming feature flags
export const useFeatureFlags = (): FeatureFlagContextValue => {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

// Convenience hook for single flag check
export const useFeatureFlag = (flagName: keyof FeatureFlags): boolean => {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagName);
};

// Helper function for consistent user bucketing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

---

## Building Feature Flag Components

Now let's create reusable components that leverage our context system.

### The Feature Component

A declarative way to conditionally render based on flags:

```tsx
// components/Feature.tsx
import React, { ReactNode } from 'react';
import { useFeatureFlags, FeatureFlags } from '../context/FeatureFlagContext';

interface FeatureProps {
  flag: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
  userId?: string;
}

export const Feature: React.FC<FeatureProps> = ({
  flag,
  children,
  fallback = null,
  userId,
}) => {
  const { isEnabled, isEnabledForUser } = useFeatureFlags();

  const enabled = userId
    ? isEnabledForUser(flag, userId)
    : isEnabled(flag);

  return <>{enabled ? children : fallback}</>;
};

// Usage example:
// <Feature flag="newNavigation" fallback={<OldNav />}>
//   <NewNav />
// </Feature>
```

### The FeatureVariant Component

For A/B testing with multiple variants:

```tsx
// components/FeatureVariant.tsx
import React, { ReactNode } from 'react';
import { useFeatureFlags, FeatureFlags } from '../context/FeatureFlagContext';

type VariantFlags = {
  [K in keyof FeatureFlags]: FeatureFlags[K] extends string ? K : never;
}[keyof FeatureFlags];

interface VariantConfig<T extends string> {
  variant: T;
  component: ReactNode;
}

interface FeatureVariantProps<T extends string> {
  flag: VariantFlags;
  variants: VariantConfig<T>[];
  defaultComponent?: ReactNode;
}

export function FeatureVariant<T extends string>({
  flag,
  variants,
  defaultComponent = null,
}: FeatureVariantProps<T>): JSX.Element {
  const { getVariant } = useFeatureFlags();
  const currentVariant = getVariant(flag) as T;

  const matchedVariant = variants.find(v => v.variant === currentVariant);

  return <>{matchedVariant?.component ?? defaultComponent}</>;
}

// Usage example:
// <FeatureVariant
//   flag="checkoutVariant"
//   variants={[
//     { variant: 'control', component: <StandardCheckout /> },
//     { variant: 'variant-a', component: <SimplifiedCheckout /> },
//     { variant: 'variant-b', component: <OneClickCheckout /> },
//   ]}
// />
```

### Higher-Order Component Pattern

For class components or when you prefer HOCs:

```tsx
// hoc/withFeatureFlag.tsx
import React, { ComponentType } from 'react';
import { useFeatureFlags, FeatureFlags } from '../context/FeatureFlagContext';

interface WithFeatureFlagOptions {
  flag: keyof FeatureFlags;
  fallback?: ComponentType<any>;
}

export function withFeatureFlag<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithFeatureFlagOptions
): ComponentType<P> {
  const { flag, fallback: FallbackComponent } = options;

  const WithFeatureFlag: React.FC<P> = (props) => {
    const { isEnabled } = useFeatureFlags();

    if (!isEnabled(flag)) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };

  WithFeatureFlag.displayName = `withFeatureFlag(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithFeatureFlag;
}

// Usage:
// const EnhancedDashboard = withFeatureFlag(NewDashboard, {
//   flag: 'newNavigation',
//   fallback: LegacyDashboard,
// });
```

---

## Advanced Feature Flag Patterns

### Pattern 4: User Segmentation and Targeting

Real-world feature flags often need to target specific user segments:

```typescript
// types/targeting.ts
export interface UserContext {
  userId: string;
  email: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  createdAt: Date;
  country: string;
  betaOptIn: boolean;
  employeeId?: string;
}

export interface TargetingRule {
  attribute: keyof UserContext;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'notIn';
  value: string | number | boolean | string[];
}

export interface FlagConfiguration {
  enabled: boolean;
  percentageRollout: number;
  targetingRules: TargetingRule[];
  allowlist: string[]; // User IDs always enabled
  blocklist: string[]; // User IDs always disabled
}
```

```typescript
// services/targetingEngine.ts
import { UserContext, TargetingRule, FlagConfiguration } from '../types/targeting';

export class TargetingEngine {
  evaluateFlag(
    config: FlagConfiguration,
    user: UserContext
  ): boolean {
    // Check blocklist first
    if (config.blocklist.includes(user.userId)) {
      return false;
    }

    // Check allowlist
    if (config.allowlist.includes(user.userId)) {
      return true;
    }

    // Check if flag is globally disabled
    if (!config.enabled) {
      return false;
    }

    // Evaluate targeting rules (all must pass)
    const rulesPass = config.targetingRules.every(rule =>
      this.evaluateRule(rule, user)
    );

    if (!rulesPass) {
      return false;
    }

    // Apply percentage rollout
    if (config.percentageRollout < 100) {
      return this.isInRolloutPercentage(user.userId, config.percentageRollout);
    }

    return true;
  }

  private evaluateRule(rule: TargetingRule, user: UserContext): boolean {
    const userValue = user[rule.attribute];
    const ruleValue = rule.value;

    switch (rule.operator) {
      case 'equals':
        return userValue === ruleValue;

      case 'contains':
        return String(userValue).includes(String(ruleValue));

      case 'gt':
        if (userValue instanceof Date) {
          return userValue.getTime() > new Date(ruleValue as string).getTime();
        }
        return Number(userValue) > Number(ruleValue);

      case 'lt':
        if (userValue instanceof Date) {
          return userValue.getTime() < new Date(ruleValue as string).getTime();
        }
        return Number(userValue) < Number(ruleValue);

      case 'in':
        return (ruleValue as string[]).includes(String(userValue));

      case 'notIn':
        return !(ruleValue as string[]).includes(String(userValue));

      default:
        return false;
    }
  }

  private isInRolloutPercentage(userId: string, percentage: number): boolean {
    const hash = this.hashUserId(userId);
    return (hash % 100) < percentage;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
```

### Pattern 5: Feature Flag with Analytics Integration

Track feature flag exposure for analysis:

```typescript
// hooks/useTrackedFeatureFlag.ts
import { useEffect, useCallback, useRef } from 'react';
import { useFeatureFlags, FeatureFlags } from '../context/FeatureFlagContext';

interface AnalyticsEvent {
  eventName: string;
  properties: Record<string, unknown>;
}

interface AnalyticsProvider {
  track: (event: AnalyticsEvent) => void;
}

// Default no-op analytics provider
const defaultAnalytics: AnalyticsProvider = {
  track: () => {},
};

export const useTrackedFeatureFlag = (
  flagName: keyof FeatureFlags,
  analytics: AnalyticsProvider = defaultAnalytics
): boolean => {
  const { isEnabled, getVariant } = useFeatureFlags();
  const enabled = isEnabled(flagName);
  const variant = getVariant(flagName);
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (!hasTracked.current) {
      analytics.track({
        eventName: 'feature_flag_exposure',
        properties: {
          flag_name: flagName,
          flag_enabled: enabled,
          flag_variant: variant,
          timestamp: new Date().toISOString(),
        },
      });
      hasTracked.current = true;
    }
  }, [flagName, enabled, variant, analytics]);

  return enabled;
};

// Usage with your analytics provider:
// const showNewFeature = useTrackedFeatureFlag('newFeature', mixpanelAnalytics);
```

### Pattern 6: Feature Flags with Local Storage Override

Enable developers and QA to override flags locally:

```typescript
// hooks/useFeatureFlagWithOverride.ts
import { useState, useEffect, useCallback } from 'react';
import { useFeatureFlags, FeatureFlags } from '../context/FeatureFlagContext';

const OVERRIDE_STORAGE_KEY = 'featureFlagOverrides';

interface FlagOverrides {
  [key: string]: boolean | string | number;
}

export const useFeatureFlagWithOverride = () => {
  const { flags, isEnabled, getVariant } = useFeatureFlags();
  const [overrides, setOverrides] = useState<FlagOverrides>({});

  // Load overrides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OVERRIDE_STORAGE_KEY);
      if (stored) {
        setOverrides(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load feature flag overrides:', error);
    }
  }, []);

  // Save overrides to localStorage
  const saveOverrides = useCallback((newOverrides: FlagOverrides) => {
    setOverrides(newOverrides);
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(newOverrides));
  }, []);

  // Override a specific flag
  const setOverride = useCallback(
    (flagName: keyof FeatureFlags, value: boolean | string | number) => {
      saveOverrides({ ...overrides, [flagName]: value });
    },
    [overrides, saveOverrides]
  );

  // Remove an override
  const clearOverride = useCallback(
    (flagName: keyof FeatureFlags) => {
      const { [flagName]: _, ...rest } = overrides;
      saveOverrides(rest);
    },
    [overrides, saveOverrides]
  );

  // Clear all overrides
  const clearAllOverrides = useCallback(() => {
    setOverrides({});
    localStorage.removeItem(OVERRIDE_STORAGE_KEY);
  }, []);

  // Get flag value with override
  const getFlagValue = useCallback(
    <K extends keyof FeatureFlags>(flagName: K): FeatureFlags[K] => {
      if (flagName in overrides) {
        return overrides[flagName] as FeatureFlags[K];
      }
      return getVariant(flagName);
    },
    [overrides, getVariant]
  );

  // Check if flag is enabled with override
  const isFlagEnabled = useCallback(
    (flagName: keyof FeatureFlags): boolean => {
      if (flagName in overrides) {
        const override = overrides[flagName];
        return typeof override === 'boolean' ? override : Boolean(override);
      }
      return isEnabled(flagName);
    },
    [overrides, isEnabled]
  );

  return {
    flags,
    overrides,
    isFlagEnabled,
    getFlagValue,
    setOverride,
    clearOverride,
    clearAllOverrides,
  };
};
```

---

## Developer Tools for Feature Flags

### Feature Flag Debug Panel

A development-only panel to inspect and override flags:

```tsx
// components/FeatureFlagDebugPanel.tsx
import React, { useState } from 'react';
import { useFeatureFlagWithOverride } from '../hooks/useFeatureFlagWithOverride';
import { FeatureFlags, defaultFeatureFlags } from '../context/FeatureFlagContext';

export const FeatureFlagDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    flags,
    overrides,
    setOverride,
    clearOverride,
    clearAllOverrides,
  } = useFeatureFlagWithOverride();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const flagEntries = Object.entries(flags) as [keyof FeatureFlags, unknown][];

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '10px 15px',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        Feature Flags
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            width: '400px',
            maxHeight: '500px',
            overflowY: 'auto',
            backgroundColor: '#1f2937',
            color: '#f3f4f6',
            borderRadius: '12px',
            padding: '20px',
            zIndex: 9999,
            fontFamily: 'monospace',
            fontSize: '13px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: 0 }}>Feature Flags</h3>
            <button
              onClick={clearAllOverrides}
              style={{
                padding: '5px 10px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Clear All Overrides
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Flag</th>
                <th style={{ textAlign: 'center', padding: '8px 4px' }}>Value</th>
                <th style={{ textAlign: 'center', padding: '8px 4px' }}>Override</th>
              </tr>
            </thead>
            <tbody>
              {flagEntries.map(([name, value]) => {
                const hasOverride = name in overrides;
                const displayValue = hasOverride ? overrides[name] : value;

                return (
                  <tr
                    key={name}
                    style={{
                      backgroundColor: hasOverride ? '#374151' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px 4px' }}>{name}</td>
                    <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                      {renderFlagControl(name, displayValue, setOverride)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                      {hasOverride && (
                        <button
                          onClick={() => clearOverride(name)}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

function renderFlagControl(
  name: keyof FeatureFlags,
  value: unknown,
  setOverride: (name: keyof FeatureFlags, value: any) => void
): JSX.Element {
  if (typeof value === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => setOverride(name, e.target.checked)}
        style={{ cursor: 'pointer' }}
      />
    );
  }

  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        min={0}
        max={100}
        onChange={(e) => setOverride(name, parseInt(e.target.value, 10))}
        style={{
          width: '60px',
          padding: '4px',
          backgroundColor: '#374151',
          color: '#f3f4f6',
          border: '1px solid #4b5563',
          borderRadius: '4px',
        }}
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setOverride(name, e.target.value)}
        style={{
          width: '100px',
          padding: '4px',
          backgroundColor: '#374151',
          color: '#f3f4f6',
          border: '1px solid #4b5563',
          borderRadius: '4px',
        }}
      />
    );
  }

  return <span>{JSON.stringify(value)}</span>;
}
```

---

## Testing Feature Flags

Proper testing is crucial for feature flag implementations.

### Unit Testing with Jest

```typescript
// __tests__/FeatureFlag.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeatureFlagProvider, defaultFeatureFlags } from '../context/FeatureFlagContext';
import { Feature } from '../components/Feature';

// Mock fetch for testing
const mockFetch = (flags: Partial<typeof defaultFeatureFlags>) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(flags),
  });
};

describe('Feature component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when flag is enabled', async () => {
    mockFetch({ newNavigation: true });

    render(
      <FeatureFlagProvider>
        <Feature flag="newNavigation">
          <div>New Navigation</div>
        </Feature>
      </FeatureFlagProvider>
    );

    // Wait for flags to load
    expect(await screen.findByText('New Navigation')).toBeInTheDocument();
  });

  it('renders fallback when flag is disabled', async () => {
    mockFetch({ newNavigation: false });

    render(
      <FeatureFlagProvider>
        <Feature flag="newNavigation" fallback={<div>Old Navigation</div>}>
          <div>New Navigation</div>
        </Feature>
      </FeatureFlagProvider>
    );

    expect(await screen.findByText('Old Navigation')).toBeInTheDocument();
    expect(screen.queryByText('New Navigation')).not.toBeInTheDocument();
  });

  it('renders nothing when flag is disabled and no fallback provided', async () => {
    mockFetch({ newNavigation: false });

    const { container } = render(
      <FeatureFlagProvider>
        <Feature flag="newNavigation">
          <div>New Navigation</div>
        </Feature>
      </FeatureFlagProvider>
    );

    // Wait for loading to complete
    await screen.findByText(() => true, {}, { timeout: 100 }).catch(() => {});

    expect(screen.queryByText('New Navigation')).not.toBeInTheDocument();
  });
});
```

### Testing Utilities

```typescript
// test-utils/featureFlagTestUtils.tsx
import React, { ReactNode } from 'react';
import { FeatureFlagProvider, FeatureFlags, defaultFeatureFlags } from '../context/FeatureFlagContext';

interface TestProviderProps {
  children: ReactNode;
  flags?: Partial<FeatureFlags>;
}

export const TestFeatureFlagProvider: React.FC<TestProviderProps> = ({
  children,
  flags = {},
}) => {
  // Mock fetch to return test flags
  const mockFlags = { ...defaultFeatureFlags, ...flags };

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockFlags),
  });

  return (
    <FeatureFlagProvider>
      {children}
    </FeatureFlagProvider>
  );
};

// Helper to create test wrappers
export const createFeatureFlagWrapper = (flags: Partial<FeatureFlags>) => {
  return ({ children }: { children: ReactNode }) => (
    <TestFeatureFlagProvider flags={flags}>
      {children}
    </TestFeatureFlagProvider>
  );
};

// Usage in tests:
// const { result } = renderHook(() => useFeatureFlag('newNavigation'), {
//   wrapper: createFeatureFlagWrapper({ newNavigation: true }),
// });
```

---

## Best Practices and Anti-Patterns

### Best Practices

**1. Naming Conventions**

Use clear, descriptive names that indicate the feature purpose:

```typescript
// Good
const flags = {
  enableNewCheckoutFlow: boolean,
  showBetaDashboard: boolean,
  useOptimizedImageLoader: boolean,
};

// Bad
const flags = {
  flag1: boolean,
  newThing: boolean,
  temp: boolean,
};
```

**2. Flag Lifecycle Management**

Every flag should have an expiration plan:

```typescript
interface FlagMetadata {
  name: string;
  description: string;
  owner: string;
  createdAt: Date;
  expectedRemovalDate: Date;
  jiraTicket: string;
}

const flagRegistry: FlagMetadata[] = [
  {
    name: 'newCheckoutFlow',
    description: 'Three-step checkout with saved payment methods',
    owner: 'payments-team',
    createdAt: new Date('2024-01-15'),
    expectedRemovalDate: new Date('2024-03-15'),
    jiraTicket: 'PAY-1234',
  },
];
```

**3. Default to Off**

New flags should default to disabled to prevent accidental exposure:

```typescript
export const defaultFeatureFlags: FeatureFlags = {
  experimentalFeature: false, // Safe default
  newPaymentProvider: false,  // Safe default
};
```

**4. Limit Flag Scope**

Keep flags focused on single features:

```typescript
// Good: Single responsibility
const flags = {
  enableStripePayments: boolean,
  enablePaypalPayments: boolean,
  showSavedCards: boolean,
};

// Bad: Too broad
const flags = {
  enableNewPaymentSystem: boolean, // What does this include?
};
```

### Anti-Patterns to Avoid

**1. Flag Dependencies**

```typescript
// Anti-pattern: Nested flag dependencies
if (flags.featureA) {
  if (flags.featureB) {
    if (flags.featureC) {
      // This becomes unmaintainable
    }
  }
}

// Better: Composite flag
const showAdvancedFeature = flags.featureA && flags.featureB && flags.featureC;
```

**2. Long-Lived Flags**

```typescript
// Anti-pattern: Flag that's been around for 2 years
if (flags.newUserInterface) {
  return <NewUI />;
}
return <OldUI />; // Is this code even tested anymore?

// Solution: Set calendar reminders to remove flags after rollout completion
```

**3. Using Flags for Configuration**

```typescript
// Anti-pattern: Using flags for config values
const maxUploadSize = flags.uploadSizeLarge ? 100 : 50;

// Better: Use proper configuration
const config = {
  maxUploadSize: 100, // MB
};
```

**4. Too Many Active Flags**

```typescript
// Anti-pattern: Dozens of active flags
// Leads to combinatorial explosion of states

// Solution: Limit active flags (aim for < 10 per service)
// Archive flags promptly after full rollout
```

---

## Integrating with Remote Flag Services

For production applications, consider using a dedicated feature flag service:

```typescript
// services/remoteFeatureFlagService.ts
interface RemoteFlagService {
  initialize(config: { apiKey: string; userId?: string }): Promise<void>;
  isEnabled(flagKey: string): boolean;
  getVariant(flagKey: string): string | null;
  onFlagChange(callback: (flags: Record<string, unknown>) => void): () => void;
}

// Example integration with a hypothetical service
class ProductionFeatureFlagService implements RemoteFlagService {
  private client: any; // Your SDK client
  private flags: Record<string, unknown> = {};

  async initialize(config: { apiKey: string; userId?: string }): Promise<void> {
    // Initialize your SDK
    // this.client = await SDK.initialize(config);
    // this.flags = await this.client.getAllFlags();
  }

  isEnabled(flagKey: string): boolean {
    const value = this.flags[flagKey];
    return Boolean(value);
  }

  getVariant(flagKey: string): string | null {
    const value = this.flags[flagKey];
    return typeof value === 'string' ? value : null;
  }

  onFlagChange(callback: (flags: Record<string, unknown>) => void): () => void {
    // Subscribe to real-time updates
    // return this.client.subscribe(callback);
    return () => {};
  }
}
```

---

## Monitoring and Observability

Feature flags should be observable. Integrate with your monitoring stack:

```typescript
// utils/flagObservability.ts
interface FlagMetrics {
  flagEvaluations: Map<string, number>;
  flagLatency: Map<string, number[]>;
}

class FeatureFlagMetrics {
  private metrics: FlagMetrics = {
    flagEvaluations: new Map(),
    flagLatency: new Map(),
  };

  recordEvaluation(flagName: string, durationMs: number): void {
    // Increment evaluation count
    const count = this.metrics.flagEvaluations.get(flagName) || 0;
    this.metrics.flagEvaluations.set(flagName, count + 1);

    // Record latency
    const latencies = this.metrics.flagLatency.get(flagName) || [];
    latencies.push(durationMs);
    this.metrics.flagLatency.set(flagName, latencies);

    // Send to monitoring service
    this.sendToMonitoring({
      metric: 'feature_flag.evaluation',
      tags: { flag_name: flagName },
      value: 1,
    });
  }

  private sendToMonitoring(data: unknown): void {
    // Integration with your observability platform
    // Could be OneUptime, DataDog, Prometheus, etc.
    console.debug('Feature flag metric:', data);
  }

  getStats(): Record<string, { evaluations: number; avgLatencyMs: number }> {
    const stats: Record<string, { evaluations: number; avgLatencyMs: number }> = {};

    this.metrics.flagEvaluations.forEach((count, flagName) => {
      const latencies = this.metrics.flagLatency.get(flagName) || [];
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      stats[flagName] = {
        evaluations: count,
        avgLatencyMs: avgLatency,
      };
    });

    return stats;
  }
}

export const flagMetrics = new FeatureFlagMetrics();
```

---

## Summary: Feature Flag Implementation Comparison

| Pattern | Complexity | Use Case | Pros | Cons |
|---------|------------|----------|------|------|
| **Environment Variables** | Low | Simple toggles, build-time decisions | Zero runtime overhead, simple | Requires rebuild, no targeting |
| **Runtime Config Object** | Low | Server-controlled toggles | No rebuild needed, centralized | No user targeting, manual refresh |
| **React Context** | Medium | App-wide flag management | Type-safe, React-idiomatic, testable | Requires provider setup |
| **User Segmentation** | High | Gradual rollouts, A/B tests | Precise targeting, percentage rollouts | More complex evaluation logic |
| **Remote Service** | High | Enterprise deployments | Real-time updates, audit logs, UI | External dependency, cost |

---

## Quick Reference: Implementation Checklist

- [ ] Choose a pattern based on your needs (start simple, evolve as needed)
- [ ] Define TypeScript interfaces for flag types
- [ ] Implement a context provider for React integration
- [ ] Create reusable components (Feature, FeatureVariant)
- [ ] Add development tools for testing and debugging
- [ ] Set up unit tests with mock providers
- [ ] Establish naming conventions and documentation standards
- [ ] Create a flag lifecycle management process
- [ ] Integrate with monitoring and analytics
- [ ] Plan for flag cleanup after full rollouts

---

## Conclusion

Feature flags are a powerful technique that enables safer deployments, faster iteration, and data-driven product decisions. In React applications, the context-based pattern provides the best balance of type safety, testability, and developer experience.

Start with the simplest implementation that meets your needs. A basic boolean flag system can evolve into a sophisticated targeting engine as your requirements grow. The key is to establish good practices early: clear naming, lifecycle management, and observability.

Remember that every feature flag is technical debt until removed. Build your system with flag cleanup in mind from day one. The goal is not to accumulate flags but to use them as a temporary tool for safer releases.

For production workloads, consider how feature flags integrate with your broader reliability strategy. Combined with proper monitoring through platforms like OneUptime, feature flags become part of your incident response toolkit, enabling instant rollbacks when issues arise.

---

**Related Reading:**

- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [SRE Best Practices That Actually Move the Needle](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
- [Monitoring vs Observability for SRE Teams](https://oneuptime.com/blog/post/2025-11-28-monitoring-vs-observability-sre/view)
