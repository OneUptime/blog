# How to Implement Feature Flag Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Feature Flags, Deployment, DevOps, Release Management

Description: Deploy features safely with feature flags for gradual rollouts, A/B testing, and instant rollbacks without redeployment.

---

Feature flags let you deploy code to production without exposing it to users until you're ready. You can ship features behind a flag, test them with a small percentage of users, and instantly disable them if something goes wrong. No rollback deployment required.

This guide covers practical implementation patterns for feature flags, from simple boolean toggles to sophisticated percentage-based rollouts with user targeting.

## What Are Feature Flags?

A feature flag is a conditional statement in your code that determines whether a feature is active. At its simplest:

```javascript
// Basic feature flag check
if (featureFlags.isEnabled('new-checkout-flow')) {
    renderNewCheckout();
} else {
    renderLegacyCheckout();
}
```

The power comes from controlling that flag value externally, without changing code or redeploying.

## Types of Feature Flags

Different flags serve different purposes. Understanding the types helps you manage them properly.

| Flag Type | Purpose | Lifespan | Example |
|-----------|---------|----------|---------|
| Release Flags | Control feature rollout | Short (days to weeks) | New payment form |
| Experiment Flags | A/B testing | Medium (weeks to months) | Button color test |
| Ops Flags | Operational control | Long-lived | Circuit breakers |
| Permission Flags | User entitlements | Permanent | Premium features |

### Release Flags

Release flags gate new features during deployment. They're temporary and should be removed once the feature is fully rolled out.

```typescript
// Release flag for a new dashboard
class DashboardService {
    async getDashboard(userId: string): Promise<Dashboard> {
        const useNewDashboard = await this.featureFlags.isEnabled(
            'new-analytics-dashboard',
            { userId }
        );

        if (useNewDashboard) {
            return this.buildNewDashboard(userId);
        }

        return this.buildLegacyDashboard(userId);
    }
}
```

### Experiment Flags

Experiment flags support A/B testing by assigning users to different variants.

```typescript
// Experiment flag with multiple variants
interface ExperimentVariant {
    name: string;
    weight: number;  // Percentage of users
}

class PricingExperiment {
    private variants: ExperimentVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'variant-a', weight: 25 },
        { name: 'variant-b', weight: 25 }
    ];

    async getPricingPage(userId: string): Promise<PricingPage> {
        const variant = await this.featureFlags.getVariant(
            'pricing-page-experiment',
            userId,
            this.variants
        );

        // Track which variant the user saw for analysis
        await this.analytics.track('experiment-exposure', {
            experimentId: 'pricing-page-experiment',
            variant: variant.name,
            userId
        });

        return this.renderPricingPage(variant.name);
    }
}
```

### Ops Flags (Kill Switches)

Ops flags let you quickly disable features or degrade functionality during incidents.

```typescript
// Kill switch for external service dependency
class PaymentService {
    async processPayment(order: Order): Promise<PaymentResult> {
        // Check if payment processing is enabled
        const paymentsEnabled = await this.featureFlags.isEnabled(
            'ops-payments-enabled'
        );

        if (!paymentsEnabled) {
            // Queue for later processing instead of failing
            await this.paymentQueue.enqueue(order);
            return {
                status: 'queued',
                message: 'Payment will be processed shortly'
            };
        }

        return this.stripeClient.charge(order);
    }
}
```

## Building a Feature Flag Service

Let's build a feature flag service from scratch. We'll start simple and add sophistication.

### Basic Flag Storage

First, define how flags are stored and retrieved.

```typescript
// types.ts - Core type definitions
interface FeatureFlag {
    key: string;
    enabled: boolean;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

interface FlagContext {
    userId?: string;
    email?: string;
    country?: string;
    userAgent?: string;
    customAttributes?: Record<string, string | number | boolean>;
}

interface FlagEvaluation {
    flagKey: string;
    enabled: boolean;
    reason: string;
    timestamp: Date;
}
```

```typescript
// flag-store.ts - In-memory flag storage with persistence
import { Redis } from 'ioredis';

class FlagStore {
    private redis: Redis;
    private localCache: Map<string, FeatureFlag>;
    private cacheExpiry: number = 30000; // 30 seconds

    constructor(redisUrl: string) {
        this.redis = new Redis(redisUrl);
        this.localCache = new Map();
        this.startCacheRefresh();
    }

    async getFlag(key: string): Promise<FeatureFlag | null> {
        // Check local cache first
        const cached = this.localCache.get(key);
        if (cached) {
            return cached;
        }

        // Fetch from Redis
        const data = await this.redis.get(`flag:${key}`);
        if (!data) {
            return null;
        }

        const flag = JSON.parse(data) as FeatureFlag;
        this.localCache.set(key, flag);
        return flag;
    }

    async setFlag(flag: FeatureFlag): Promise<void> {
        await this.redis.set(
            `flag:${flag.key}`,
            JSON.stringify(flag)
        );
        this.localCache.set(flag.key, flag);
    }

    async getAllFlags(): Promise<FeatureFlag[]> {
        const keys = await this.redis.keys('flag:*');
        if (keys.length === 0) {
            return [];
        }

        const values = await this.redis.mget(keys);
        return values
            .filter((v): v is string => v !== null)
            .map(v => JSON.parse(v) as FeatureFlag);
    }

    private startCacheRefresh(): void {
        setInterval(() => {
            this.localCache.clear();
        }, this.cacheExpiry);
    }
}
```

### The Feature Flag Service

Now build the main service that evaluates flags.

```typescript
// feature-flag-service.ts
class FeatureFlagService {
    private store: FlagStore;
    private evaluationLog: EvaluationLogger;

    constructor(store: FlagStore, logger: EvaluationLogger) {
        this.store = store;
        this.evaluationLog = logger;
    }

    async isEnabled(
        flagKey: string,
        context: FlagContext = {}
    ): Promise<boolean> {
        const flag = await this.store.getFlag(flagKey);

        if (!flag) {
            // Flag doesn't exist, default to disabled
            await this.logEvaluation(flagKey, false, 'flag-not-found', context);
            return false;
        }

        const enabled = flag.enabled;
        await this.logEvaluation(flagKey, enabled, 'basic-evaluation', context);
        return enabled;
    }

    private async logEvaluation(
        flagKey: string,
        enabled: boolean,
        reason: string,
        context: FlagContext
    ): Promise<void> {
        await this.evaluationLog.log({
            flagKey,
            enabled,
            reason,
            timestamp: new Date(),
            context
        });
    }
}
```

## Percentage-Based Rollouts

Percentage rollouts let you gradually expose features to more users.

### Consistent Hashing for User Assignment

Users should always see the same flag state for a given rollout percentage. Use consistent hashing to achieve this.

```typescript
// percentage-rollout.ts
import * as crypto from 'crypto';

interface PercentageConfig {
    percentage: number;  // 0-100
    salt: string;        // Unique per flag to ensure independent distribution
}

class PercentageRollout {
    // Generate a consistent hash value between 0-99 for a user
    private getUserBucket(userId: string, salt: string): number {
        const hash = crypto
            .createHash('md5')
            .update(`${salt}:${userId}`)
            .digest('hex');

        // Take first 8 chars of hash and convert to number
        const hashInt = parseInt(hash.substring(0, 8), 16);
        return hashInt % 100;
    }

    isUserInRollout(
        userId: string,
        config: PercentageConfig
    ): boolean {
        const bucket = this.getUserBucket(userId, config.salt);
        return bucket < config.percentage;
    }
}

// Usage example
const rollout = new PercentageRollout();

// User gets consistent assignment
const config = { percentage: 25, salt: 'new-checkout-2024' };
console.log(rollout.isUserInRollout('user-123', config)); // true or false
console.log(rollout.isUserInRollout('user-123', config)); // Same result
```

### Gradual Rollout Strategy

Here's a pattern for gradually increasing rollout percentage.

```typescript
// gradual-rollout.ts
interface RolloutSchedule {
    flagKey: string;
    stages: RolloutStage[];
    currentStage: number;
}

interface RolloutStage {
    percentage: number;
    minimumDuration: number;  // Hours before advancing
    healthCheck: () => Promise<boolean>;
}

class GradualRolloutManager {
    private flagService: FeatureFlagService;
    private schedules: Map<string, RolloutSchedule>;

    constructor(flagService: FeatureFlagService) {
        this.flagService = flagService;
        this.schedules = new Map();
    }

    async createRolloutSchedule(
        flagKey: string,
        stages: RolloutStage[]
    ): Promise<void> {
        const schedule: RolloutSchedule = {
            flagKey,
            stages,
            currentStage: 0
        };

        this.schedules.set(flagKey, schedule);

        // Start with first stage percentage
        await this.flagService.updatePercentage(
            flagKey,
            stages[0].percentage
        );
    }

    async advanceRollout(flagKey: string): Promise<boolean> {
        const schedule = this.schedules.get(flagKey);
        if (!schedule) {
            throw new Error(`No rollout schedule found for ${flagKey}`);
        }

        const currentStage = schedule.stages[schedule.currentStage];

        // Run health check before advancing
        const healthy = await currentStage.healthCheck();
        if (!healthy) {
            console.log(`Health check failed for ${flagKey}, not advancing`);
            return false;
        }

        // Move to next stage
        schedule.currentStage++;

        if (schedule.currentStage >= schedule.stages.length) {
            // Rollout complete
            console.log(`Rollout complete for ${flagKey}`);
            return true;
        }

        const nextStage = schedule.stages[schedule.currentStage];
        await this.flagService.updatePercentage(
            flagKey,
            nextStage.percentage
        );

        console.log(
            `Advanced ${flagKey} to ${nextStage.percentage}%`
        );
        return true;
    }
}

// Example rollout schedule
const rolloutStages: RolloutStage[] = [
    {
        percentage: 1,
        minimumDuration: 2,
        healthCheck: async () => {
            // Check error rates, latency, etc.
            const errorRate = await getErrorRate('new-checkout');
            return errorRate < 0.01; // Less than 1% errors
        }
    },
    {
        percentage: 5,
        minimumDuration: 4,
        healthCheck: async () => {
            const errorRate = await getErrorRate('new-checkout');
            return errorRate < 0.01;
        }
    },
    {
        percentage: 25,
        minimumDuration: 24,
        healthCheck: async () => {
            const errorRate = await getErrorRate('new-checkout');
            const conversionRate = await getConversionRate('new-checkout');
            return errorRate < 0.01 && conversionRate > 0.02;
        }
    },
    {
        percentage: 50,
        minimumDuration: 48,
        healthCheck: async () => true
    },
    {
        percentage: 100,
        minimumDuration: 0,
        healthCheck: async () => true
    }
];
```

## User Targeting Rules

Target specific users or user segments with feature flags.

### Rule-Based Targeting

```typescript
// targeting-rules.ts
type RuleOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'in_list'
    | 'greater_than'
    | 'less_than'
    | 'matches_regex';

interface TargetingRule {
    attribute: string;
    operator: RuleOperator;
    value: string | number | boolean | string[];
}

interface TargetingConfig {
    rules: TargetingRule[];
    matchType: 'all' | 'any';  // AND vs OR
}

class TargetingEngine {
    evaluate(
        config: TargetingConfig,
        context: FlagContext
    ): boolean {
        const results = config.rules.map(rule =>
            this.evaluateRule(rule, context)
        );

        if (config.matchType === 'all') {
            return results.every(r => r);
        }
        return results.some(r => r);
    }

    private evaluateRule(
        rule: TargetingRule,
        context: FlagContext
    ): boolean {
        const attributeValue = this.getAttributeValue(rule.attribute, context);

        if (attributeValue === undefined) {
            return false;
        }

        switch (rule.operator) {
            case 'equals':
                return attributeValue === rule.value;

            case 'not_equals':
                return attributeValue !== rule.value;

            case 'contains':
                return String(attributeValue).includes(String(rule.value));

            case 'starts_with':
                return String(attributeValue).startsWith(String(rule.value));

            case 'ends_with':
                return String(attributeValue).endsWith(String(rule.value));

            case 'in_list':
                return (rule.value as string[]).includes(String(attributeValue));

            case 'greater_than':
                return Number(attributeValue) > Number(rule.value);

            case 'less_than':
                return Number(attributeValue) < Number(rule.value);

            case 'matches_regex':
                const regex = new RegExp(String(rule.value));
                return regex.test(String(attributeValue));

            default:
                return false;
        }
    }

    private getAttributeValue(
        attribute: string,
        context: FlagContext
    ): string | number | boolean | undefined {
        // Check standard attributes
        if (attribute in context) {
            return context[attribute as keyof FlagContext] as string;
        }

        // Check custom attributes
        return context.customAttributes?.[attribute];
    }
}
```

### Complete Flag Evaluation with Targeting

```typescript
// enhanced-flag-service.ts
interface EnhancedFlag extends FeatureFlag {
    targeting?: TargetingConfig;
    percentageRollout?: PercentageConfig;
    userWhitelist?: string[];
    userBlacklist?: string[];
}

class EnhancedFeatureFlagService {
    private store: FlagStore;
    private targeting: TargetingEngine;
    private rollout: PercentageRollout;

    constructor(store: FlagStore) {
        this.store = store;
        this.targeting = new TargetingEngine();
        this.rollout = new PercentageRollout();
    }

    async isEnabled(
        flagKey: string,
        context: FlagContext = {}
    ): Promise<FlagEvaluation> {
        const flag = await this.store.getFlag(flagKey) as EnhancedFlag;

        // Flag doesn't exist
        if (!flag) {
            return this.buildEvaluation(flagKey, false, 'flag-not-found');
        }

        // Global kill switch
        if (!flag.enabled) {
            return this.buildEvaluation(flagKey, false, 'globally-disabled');
        }

        // Check user whitelist (always enabled)
        if (context.userId && flag.userWhitelist?.includes(context.userId)) {
            return this.buildEvaluation(flagKey, true, 'user-whitelisted');
        }

        // Check user blacklist (always disabled)
        if (context.userId && flag.userBlacklist?.includes(context.userId)) {
            return this.buildEvaluation(flagKey, false, 'user-blacklisted');
        }

        // Evaluate targeting rules
        if (flag.targeting) {
            const targetingMatch = this.targeting.evaluate(
                flag.targeting,
                context
            );

            if (!targetingMatch) {
                return this.buildEvaluation(flagKey, false, 'targeting-no-match');
            }
        }

        // Percentage rollout
        if (flag.percentageRollout && context.userId) {
            const inRollout = this.rollout.isUserInRollout(
                context.userId,
                flag.percentageRollout
            );

            return this.buildEvaluation(
                flagKey,
                inRollout,
                inRollout ? 'percentage-included' : 'percentage-excluded'
            );
        }

        // All checks passed
        return this.buildEvaluation(flagKey, true, 'enabled');
    }

    private buildEvaluation(
        flagKey: string,
        enabled: boolean,
        reason: string
    ): FlagEvaluation {
        return {
            flagKey,
            enabled,
            reason,
            timestamp: new Date()
        };
    }
}
```

## Kill Switch Implementation

Kill switches need to be fast and reliable. They're your emergency brake.

```typescript
// kill-switch.ts
interface KillSwitch {
    key: string;
    enabled: boolean;
    lastTriggered?: Date;
    autoRecoveryMinutes?: number;
}

class KillSwitchManager {
    private redis: Redis;
    private localCache: Map<string, boolean>;
    private refreshInterval: number = 1000; // 1 second

    constructor(redis: Redis) {
        this.redis = redis;
        this.localCache = new Map();
        this.startBackgroundRefresh();
    }

    // Synchronous check for maximum performance
    isKilled(key: string): boolean {
        // Default to killed (safe) if not in cache
        return this.localCache.get(key) ?? true;
    }

    async trigger(key: string, reason: string): Promise<void> {
        const killSwitch: KillSwitch = {
            key,
            enabled: false,
            lastTriggered: new Date()
        };

        await this.redis.set(
            `killswitch:${key}`,
            JSON.stringify(killSwitch)
        );

        this.localCache.set(key, false);

        // Alert on-call
        await this.sendAlert({
            type: 'kill-switch-triggered',
            key,
            reason,
            timestamp: new Date()
        });

        console.log(`Kill switch triggered: ${key} - ${reason}`);
    }

    async restore(key: string): Promise<void> {
        const killSwitch: KillSwitch = {
            key,
            enabled: true
        };

        await this.redis.set(
            `killswitch:${key}`,
            JSON.stringify(killSwitch)
        );

        this.localCache.set(key, true);
        console.log(`Kill switch restored: ${key}`);
    }

    private startBackgroundRefresh(): void {
        setInterval(async () => {
            try {
                const keys = await this.redis.keys('killswitch:*');

                for (const redisKey of keys) {
                    const data = await this.redis.get(redisKey);
                    if (data) {
                        const ks = JSON.parse(data) as KillSwitch;
                        this.localCache.set(ks.key, ks.enabled);
                    }
                }
            } catch (error) {
                // On error, don't update cache
                // Existing values will continue to be used
                console.error('Kill switch refresh failed:', error);
            }
        }, this.refreshInterval);
    }

    private async sendAlert(alert: object): Promise<void> {
        // Integration with PagerDuty, Slack, etc.
    }
}

// Usage in critical paths
class CriticalService {
    private killSwitches: KillSwitchManager;

    async processRequest(request: Request): Promise<Response> {
        // Fast synchronous check
        if (!this.killSwitches.isKilled('service-enabled')) {
            return Response.serviceUnavailable(
                'Service temporarily unavailable'
            );
        }

        // Normal processing
        return this.handleRequest(request);
    }
}
```

## Flag Lifecycle Management

Feature flags accumulate technical debt if not managed properly. Here's how to keep them under control.

### Flag Metadata and Expiration

```typescript
// flag-lifecycle.ts
interface FlagMetadata {
    key: string;
    owner: string;
    team: string;
    jiraTicket?: string;
    createdAt: Date;
    expectedRemovalDate?: Date;
    flagType: 'release' | 'experiment' | 'ops' | 'permission';
    status: 'active' | 'deprecated' | 'ready-for-removal';
}

class FlagLifecycleManager {
    private store: FlagStore;
    private metadataStore: Map<string, FlagMetadata>;

    async createFlag(
        flag: FeatureFlag,
        metadata: FlagMetadata
    ): Promise<void> {
        // Validate required fields
        if (!metadata.owner) {
            throw new Error('Flag must have an owner');
        }

        if (metadata.flagType === 'release' && !metadata.expectedRemovalDate) {
            // Auto-set removal date for release flags
            const removalDate = new Date();
            removalDate.setDate(removalDate.getDate() + 30);
            metadata.expectedRemovalDate = removalDate;
        }

        await this.store.setFlag(flag);
        this.metadataStore.set(flag.key, metadata);
    }

    async getStaleFlags(): Promise<FlagMetadata[]> {
        const allMetadata = Array.from(this.metadataStore.values());
        const now = new Date();

        return allMetadata.filter(meta => {
            // Release flags past their removal date
            if (
                meta.flagType === 'release' &&
                meta.expectedRemovalDate &&
                meta.expectedRemovalDate < now
            ) {
                return true;
            }

            // Any flag older than 90 days without recent activity
            const daysSinceCreation =
                (now.getTime() - meta.createdAt.getTime()) / (1000 * 60 * 60 * 24);

            return daysSinceCreation > 90 && meta.status === 'active';
        });
    }

    async generateCleanupReport(): Promise<CleanupReport> {
        const staleFlags = await this.getStaleFlags();

        // Group by team
        const byTeam: Record<string, FlagMetadata[]> = {};

        for (const flag of staleFlags) {
            if (!byTeam[flag.team]) {
                byTeam[flag.team] = [];
            }
            byTeam[flag.team].push(flag);
        }

        return {
            totalStaleFlags: staleFlags.length,
            flagsByTeam: byTeam,
            generatedAt: new Date()
        };
    }

    async markForRemoval(flagKey: string): Promise<void> {
        const metadata = this.metadataStore.get(flagKey);
        if (metadata) {
            metadata.status = 'ready-for-removal';
            this.metadataStore.set(flagKey, metadata);
        }
    }
}

interface CleanupReport {
    totalStaleFlags: number;
    flagsByTeam: Record<string, FlagMetadata[]>;
    generatedAt: Date;
}
```

### Code Reference Tracking

Track where flags are used in your codebase to make cleanup easier.

```typescript
// flag-usage-tracker.ts
interface FlagUsage {
    flagKey: string;
    filePath: string;
    lineNumber: number;
    lastSeen: Date;
}

class FlagUsageTracker {
    private usageMap: Map<string, FlagUsage[]>;

    constructor() {
        this.usageMap = new Map();
    }

    // Call this when a flag is evaluated
    recordUsage(
        flagKey: string,
        callSite: { file: string; line: number }
    ): void {
        const usages = this.usageMap.get(flagKey) || [];

        const existingIndex = usages.findIndex(
            u => u.filePath === callSite.file && u.lineNumber === callSite.line
        );

        if (existingIndex >= 0) {
            usages[existingIndex].lastSeen = new Date();
        } else {
            usages.push({
                flagKey,
                filePath: callSite.file,
                lineNumber: callSite.line,
                lastSeen: new Date()
            });
        }

        this.usageMap.set(flagKey, usages);
    }

    getUsageLocations(flagKey: string): FlagUsage[] {
        return this.usageMap.get(flagKey) || [];
    }

    // Find flags that haven't been evaluated recently
    async findUnusedFlags(
        allFlagKeys: string[],
        daysSinceLastUse: number = 7
    ): Promise<string[]> {
        const unusedFlags: string[] = [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastUse);

        for (const key of allFlagKeys) {
            const usages = this.usageMap.get(key);

            if (!usages || usages.length === 0) {
                unusedFlags.push(key);
                continue;
            }

            const mostRecentUse = usages.reduce(
                (latest, usage) =>
                    usage.lastSeen > latest ? usage.lastSeen : latest,
                new Date(0)
            );

            if (mostRecentUse < cutoffDate) {
                unusedFlags.push(key);
            }
        }

        return unusedFlags;
    }
}
```

## React Integration

Integrate feature flags into a React application.

```tsx
// feature-flag-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface FeatureFlagContextValue {
    isEnabled: (flagKey: string) => boolean;
    isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

interface FeatureFlagProviderProps {
    userId: string;
    children: React.ReactNode;
}

export function FeatureFlagProvider({
    userId,
    children
}: FeatureFlagProviderProps) {
    const [flags, setFlags] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadFlags() {
            try {
                const response = await fetch('/api/feature-flags', {
                    headers: {
                        'X-User-Id': userId
                    }
                });
                const data = await response.json();
                setFlags(data.flags);
            } catch (error) {
                console.error('Failed to load feature flags:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadFlags();
    }, [userId]);

    const isEnabled = (flagKey: string): boolean => {
        return flags[flagKey] ?? false;
    };

    return (
        <FeatureFlagContext.Provider value={{ isEnabled, isLoading }}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

export function useFeatureFlag(flagKey: string): boolean {
    const context = useContext(FeatureFlagContext);

    if (!context) {
        throw new Error(
            'useFeatureFlag must be used within FeatureFlagProvider'
        );
    }

    return context.isEnabled(flagKey);
}

// Conditional rendering component
interface FeatureProps {
    flag: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
    const isEnabled = useFeatureFlag(flag);
    return <>{isEnabled ? children : fallback}</>;
}
```

```tsx
// Usage in components
function CheckoutPage() {
    const showNewCheckout = useFeatureFlag('new-checkout-flow');

    return (
        <div>
            <Feature flag="promo-banner">
                <PromoBanner discount={20} />
            </Feature>

            {showNewCheckout ? (
                <NewCheckoutForm />
            ) : (
                <LegacyCheckoutForm />
            )}

            <Feature
                flag="express-shipping"
                fallback={<StandardShippingOptions />}
            >
                <ExpressShippingOptions />
            </Feature>
        </div>
    );
}
```

## Testing with Feature Flags

Test your code with different flag combinations.

```typescript
// feature-flag-test-utils.ts
class TestFeatureFlagService implements FeatureFlagService {
    private overrides: Map<string, boolean>;

    constructor() {
        this.overrides = new Map();
    }

    setFlag(key: string, enabled: boolean): void {
        this.overrides.set(key, enabled);
    }

    clearFlags(): void {
        this.overrides.clear();
    }

    async isEnabled(flagKey: string): Promise<boolean> {
        return this.overrides.get(flagKey) ?? false;
    }
}

// Jest test example
describe('CheckoutService', () => {
    let flagService: TestFeatureFlagService;
    let checkoutService: CheckoutService;

    beforeEach(() => {
        flagService = new TestFeatureFlagService();
        checkoutService = new CheckoutService(flagService);
    });

    afterEach(() => {
        flagService.clearFlags();
    });

    it('should use new payment processor when flag is enabled', async () => {
        flagService.setFlag('new-payment-processor', true);

        const result = await checkoutService.processPayment({
            amount: 100,
            currency: 'USD'
        });

        expect(result.processor).toBe('stripe-v2');
    });

    it('should use legacy payment processor when flag is disabled', async () => {
        flagService.setFlag('new-payment-processor', false);

        const result = await checkoutService.processPayment({
            amount: 100,
            currency: 'USD'
        });

        expect(result.processor).toBe('stripe-v1');
    });

    // Test flag combinations
    it('should handle multiple flag combinations', async () => {
        const testCases = [
            { flags: { 'new-checkout': true, 'express-pay': true }, expected: 'express' },
            { flags: { 'new-checkout': true, 'express-pay': false }, expected: 'standard' },
            { flags: { 'new-checkout': false, 'express-pay': true }, expected: 'legacy' },
            { flags: { 'new-checkout': false, 'express-pay': false }, expected: 'legacy' },
        ];

        for (const testCase of testCases) {
            flagService.clearFlags();

            for (const [key, value] of Object.entries(testCase.flags)) {
                flagService.setFlag(key, value);
            }

            const result = await checkoutService.getCheckoutType();
            expect(result).toBe(testCase.expected);
        }
    });
});
```

## Monitoring and Analytics

Track flag performance and usage.

```typescript
// flag-analytics.ts
interface FlagEvent {
    flagKey: string;
    enabled: boolean;
    userId?: string;
    timestamp: Date;
    responseTimeMs?: number;
}

class FlagAnalytics {
    private events: FlagEvent[];
    private analyticsClient: AnalyticsClient;

    constructor(analyticsClient: AnalyticsClient) {
        this.events = [];
        this.analyticsClient = analyticsClient;
    }

    async trackEvaluation(event: FlagEvent): Promise<void> {
        this.events.push(event);

        // Send to analytics platform
        await this.analyticsClient.track('feature_flag_evaluated', {
            flag_key: event.flagKey,
            enabled: event.enabled,
            user_id: event.userId,
            response_time_ms: event.responseTimeMs
        });
    }

    async getExposureMetrics(
        flagKey: string,
        startDate: Date,
        endDate: Date
    ): Promise<ExposureMetrics> {
        const relevantEvents = this.events.filter(
            e => e.flagKey === flagKey &&
                 e.timestamp >= startDate &&
                 e.timestamp <= endDate
        );

        const totalEvaluations = relevantEvents.length;
        const enabledCount = relevantEvents.filter(e => e.enabled).length;
        const uniqueUsers = new Set(
            relevantEvents.map(e => e.userId).filter(Boolean)
        ).size;

        return {
            flagKey,
            totalEvaluations,
            enabledPercentage: (enabledCount / totalEvaluations) * 100,
            uniqueUsers,
            period: { start: startDate, end: endDate }
        };
    }
}

interface ExposureMetrics {
    flagKey: string;
    totalEvaluations: number;
    enabledPercentage: number;
    uniqueUsers: number;
    period: { start: Date; end: Date };
}
```

## Best Practices Checklist

| Practice | Description |
|----------|-------------|
| Name flags clearly | Use format: `team-feature-purpose` (e.g., `checkout-express-pay-enabled`) |
| Set expiration dates | Release flags should have removal dates from day one |
| Track ownership | Every flag needs an owner who's responsible for cleanup |
| Test both paths | Always test the code path for both flag states |
| Monitor performance | Track evaluation latency and error rates |
| Limit flag nesting | Avoid flags that depend on other flags |
| Use defaults wisely | Default to disabled for new features, enabled for ops flags |
| Clean up regularly | Review and remove stale flags monthly |

## Summary

Feature flags give you control over feature deployment without coupling releases to deployments. Start with simple boolean flags, then add percentage rollouts and user targeting as needed.

Key points to remember:

1. Use consistent hashing for percentage rollouts so users get stable experiences
2. Implement kill switches as fast, synchronous checks for critical paths
3. Track flag metadata from creation to help with cleanup
4. Test both flag states in your test suite
5. Monitor flag evaluations to catch issues early
6. Remove flags once features are fully rolled out

The implementation patterns in this guide work for both custom solutions and commercial feature flag services. The concepts remain the same whether you're using LaunchDarkly, Split, or rolling your own.

Start simple. Add complexity only when you need it. And always clean up your flags.
