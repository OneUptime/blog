# How to Build a Feature Flag Service in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TypeScript, Feature Flags, DevOps, Backend, Node.js

Description: Learn how to build a production-ready feature flag service in TypeScript with percentage rollouts, user targeting, and real-time updates.

---

Feature flags let you ship code without releasing features. They separate deployment from release, enabling A/B testing, gradual rollouts, and instant kill switches. Instead of relying on third-party services like LaunchDarkly or Flagsmith, you can build your own feature flag system tailored to your needs.

This guide walks through building a complete feature flag service in TypeScript with support for boolean flags, percentage rollouts, user targeting, and real-time updates via webhooks.

## Core Data Model

A feature flag needs several properties to support different rollout strategies. The flag can be globally enabled or disabled, target specific users, or roll out to a percentage of traffic.

```typescript
// types/flag.ts
// Core flag definition with multiple evaluation strategies
interface FeatureFlag {
  key: string;                    // Unique identifier like "dark_mode"
  enabled: boolean;               // Global kill switch
  description?: string;
  rules: FlagRule[];              // Evaluation rules in priority order
  defaultValue: boolean;          // Fallback when no rules match
  createdAt: Date;
  updatedAt: Date;
}

interface FlagRule {
  id: string;
  priority: number;               // Lower number = higher priority
  conditions: RuleCondition[];    // All conditions must match (AND logic)
  percentage?: number;            // 0-100, undefined means 100%
  value: boolean;                 // Value to return when rule matches
}

interface RuleCondition {
  attribute: string;              // User attribute to check
  operator: 'equals' | 'notEquals' | 'contains' | 'in' | 'greaterThan' | 'lessThan';
  value: string | number | string[];
}

// Context passed during flag evaluation
interface EvaluationContext {
  userId?: string;
  email?: string;
  country?: string;
  plan?: string;
  [key: string]: unknown;
}
```

## Storage Layer

The flag store handles persistence and retrieval. For production, you would use Redis or PostgreSQL. This example uses an in-memory store with file persistence for simplicity.

```typescript
// store/flagStore.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';

class FlagStore {
  private flags: Map<string, FeatureFlag> = new Map();
  private filePath: string;

  constructor(filePath: string = './flags.json') {
    this.filePath = filePath;
    this.loadFromFile();
  }

  // Load flags from persistent storage on startup
  private loadFromFile(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    try {
      const data = JSON.parse(readFileSync(this.filePath, 'utf-8'));
      for (const flag of data.flags) {
        this.flags.set(flag.key, {
          ...flag,
          createdAt: new Date(flag.createdAt),
          updatedAt: new Date(flag.updatedAt),
        });
      }
      console.log(`Loaded ${this.flags.size} flags from storage`);
    } catch (error) {
      console.error('Failed to load flags:', error);
    }
  }

  // Persist flags to disk after changes
  private saveToFile(): void {
    const data = {
      flags: Array.from(this.flags.values()),
    };
    writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  get(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  getAll(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  set(flag: FeatureFlag): void {
    flag.updatedAt = new Date();
    if (!flag.createdAt) {
      flag.createdAt = new Date();
    }
    this.flags.set(flag.key, flag);
    this.saveToFile();
  }

  delete(key: string): boolean {
    const result = this.flags.delete(key);
    if (result) {
      this.saveToFile();
    }
    return result;
  }
}

export const flagStore = new FlagStore();
```

## Flag Evaluation Engine

The evaluation engine is the heart of the feature flag service. It checks conditions against the provided context and handles percentage rollouts using consistent hashing.

```typescript
// evaluator/flagEvaluator.ts
import { createHash } from 'crypto';

class FlagEvaluator {
  // Main evaluation function that returns a boolean
  evaluate(flag: FeatureFlag, context: EvaluationContext): boolean {
    // Global kill switch check
    if (!flag.enabled) {
      return flag.defaultValue;
    }

    // Sort rules by priority and evaluate each
    const sortedRules = [...flag.rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, context, flag.key)) {
        return rule.value;
      }
    }

    // No rules matched, return default
    return flag.defaultValue;
  }

  // Check if a single rule matches the context
  private evaluateRule(
    rule: FlagRule,
    context: EvaluationContext,
    flagKey: string
  ): boolean {
    // All conditions must match (AND logic)
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    // Handle percentage rollout if specified
    if (rule.percentage !== undefined && rule.percentage < 100) {
      return this.isInPercentage(context, flagKey, rule.id, rule.percentage);
    }

    return true;
  }

  // Evaluate a single condition against context
  private evaluateCondition(
    condition: RuleCondition,
    context: EvaluationContext
  ): boolean {
    const contextValue = context[condition.attribute];

    if (contextValue === undefined) {
      return false;
    }

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;

      case 'notEquals':
        return contextValue !== condition.value;

      case 'contains':
        return String(contextValue).includes(String(condition.value));

      case 'in':
        return Array.isArray(condition.value) &&
          condition.value.includes(String(contextValue));

      case 'greaterThan':
        return Number(contextValue) > Number(condition.value);

      case 'lessThan':
        return Number(contextValue) < Number(condition.value);

      default:
        return false;
    }
  }

  // Consistent percentage rollout using hash
  // The same user always gets the same result for a given flag
  private isInPercentage(
    context: EvaluationContext,
    flagKey: string,
    ruleId: string,
    percentage: number
  ): boolean {
    const userId = context.userId || context.email || 'anonymous';
    const hashInput = `${flagKey}:${ruleId}:${userId}`;

    // Create a deterministic hash value between 0 and 100
    const hash = createHash('md5').update(hashInput).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const normalizedValue = (hashValue % 10000) / 100;

    return normalizedValue < percentage;
  }
}

export const evaluator = new FlagEvaluator();
```

## REST API for Flag Management

The API exposes endpoints for creating, updating, and evaluating flags. This is where administrators configure flags and applications fetch flag values.

```typescript
// server.ts
import express from 'express';
import { flagStore } from './store/flagStore';
import { evaluator } from './evaluator/flagEvaluator';

const app = express();
app.use(express.json());

// Get all flags (for admin UI)
app.get('/api/flags', (req, res) => {
  const flags = flagStore.getAll();
  res.json({ flags });
});

// Get a single flag definition
app.get('/api/flags/:key', (req, res) => {
  const flag = flagStore.get(req.params.key);
  if (!flag) {
    return res.status(404).json({ error: 'Flag not found' });
  }
  res.json(flag);
});

// Create or update a flag
app.put('/api/flags/:key', (req, res) => {
  const { key } = req.params;
  const { enabled, description, rules, defaultValue } = req.body;

  const existing = flagStore.get(key);

  const flag: FeatureFlag = {
    key,
    enabled: enabled ?? existing?.enabled ?? false,
    description: description ?? existing?.description,
    rules: rules ?? existing?.rules ?? [],
    defaultValue: defaultValue ?? existing?.defaultValue ?? false,
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  flagStore.set(flag);
  res.json(flag);
});

// Delete a flag
app.delete('/api/flags/:key', (req, res) => {
  const deleted = flagStore.delete(req.params.key);
  if (!deleted) {
    return res.status(404).json({ error: 'Flag not found' });
  }
  res.status(204).send();
});

// Evaluate a single flag for a given context
app.post('/api/evaluate/:key', (req, res) => {
  const flag = flagStore.get(req.params.key);
  if (!flag) {
    return res.status(404).json({ error: 'Flag not found' });
  }

  const context: EvaluationContext = req.body;
  const value = evaluator.evaluate(flag, context);

  res.json({
    key: flag.key,
    value,
    context,
  });
});

// Bulk evaluate multiple flags at once
// Clients call this on app startup to get all relevant flags
app.post('/api/evaluate', (req, res) => {
  const { flagKeys, context } = req.body;
  const results: Record<string, boolean> = {};

  const keysToEvaluate = flagKeys || flagStore.getAll().map(f => f.key);

  for (const key of keysToEvaluate) {
    const flag = flagStore.get(key);
    if (flag) {
      results[key] = evaluator.evaluate(flag, context);
    }
  }

  res.json({ flags: results });
});

app.listen(3000, () => {
  console.log('Feature flag service running on port 3000');
});
```

## Client SDK

Applications need a client SDK to fetch and cache flag values. The SDK should minimize latency by caching results locally and refreshing periodically.

```typescript
// sdk/client.ts
class FeatureFlagClient {
  private baseUrl: string;
  private context: EvaluationContext;
  private cache: Map<string, boolean> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    baseUrl: string;
    context: EvaluationContext;
    refreshIntervalMs?: number;
  }) {
    this.baseUrl = options.baseUrl;
    this.context = options.context;

    // Start background refresh
    if (options.refreshIntervalMs) {
      this.refreshInterval = setInterval(
        () => this.refresh(),
        options.refreshIntervalMs
      );
    }
  }

  // Update the evaluation context (e.g., when user logs in)
  setContext(context: EvaluationContext): void {
    this.context = { ...this.context, ...context };
    this.refresh();
  }

  // Fetch all flags from the server
  async refresh(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: this.context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.cache.clear();

      for (const [key, value] of Object.entries(data.flags)) {
        this.cache.set(key, value as boolean);
      }

      console.log(`Refreshed ${this.cache.size} feature flags`);
    } catch (error) {
      console.error('Failed to refresh flags:', error);
    }
  }

  // Get a flag value from cache
  // Returns defaultValue if flag is not cached
  isEnabled(flagKey: string, defaultValue: boolean = false): boolean {
    if (this.cache.has(flagKey)) {
      return this.cache.get(flagKey)!;
    }
    return defaultValue;
  }

  // Synchronous check with async fallback for uncached flags
  async getFlag(flagKey: string, defaultValue: boolean = false): Promise<boolean> {
    if (this.cache.has(flagKey)) {
      return this.cache.get(flagKey)!;
    }

    // Flag not in cache, fetch from server
    try {
      const response = await fetch(`${this.baseUrl}/api/evaluate/${flagKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.context),
      });

      if (!response.ok) {
        return defaultValue;
      }

      const data = await response.json();
      this.cache.set(flagKey, data.value);
      return data.value;
    } catch (error) {
      return defaultValue;
    }
  }

  // Clean up resources
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Usage example
const flagClient = new FeatureFlagClient({
  baseUrl: 'http://localhost:3000',
  context: {
    userId: 'user-123',
    email: 'user@example.com',
    plan: 'pro',
  },
  refreshIntervalMs: 60000, // Refresh every minute
});

// Initialize on startup
await flagClient.refresh();

// Check flags throughout your application
if (flagClient.isEnabled('dark_mode')) {
  renderDarkTheme();
}

if (flagClient.isEnabled('new_checkout_flow', false)) {
  showNewCheckout();
} else {
  showLegacyCheckout();
}
```

## Usage Examples

Here are some practical examples of creating flags with different targeting strategies.

```typescript
// Example: Simple boolean flag
const darkModeFlag: FeatureFlag = {
  key: 'dark_mode',
  enabled: true,
  description: 'Enable dark mode UI',
  rules: [],
  defaultValue: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example: Percentage rollout to 10% of users
const newFeatureFlag: FeatureFlag = {
  key: 'new_dashboard',
  enabled: true,
  description: 'New dashboard redesign',
  rules: [
    {
      id: 'rollout-10-percent',
      priority: 1,
      conditions: [],
      percentage: 10,
      value: true,
    },
  ],
  defaultValue: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example: Target internal users and beta testers
const betaFeatureFlag: FeatureFlag = {
  key: 'experimental_api',
  enabled: true,
  description: 'Experimental API endpoints',
  rules: [
    {
      id: 'internal-users',
      priority: 1,
      conditions: [
        {
          attribute: 'email',
          operator: 'contains',
          value: '@mycompany.com',
        },
      ],
      value: true,
    },
    {
      id: 'beta-testers',
      priority: 2,
      conditions: [
        {
          attribute: 'plan',
          operator: 'equals',
          value: 'beta',
        },
      ],
      value: true,
    },
  ],
  defaultValue: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example: Country-specific rollout
const regionalFeatureFlag: FeatureFlag = {
  key: 'local_payments',
  enabled: true,
  description: 'Local payment methods',
  rules: [
    {
      id: 'supported-countries',
      priority: 1,
      conditions: [
        {
          attribute: 'country',
          operator: 'in',
          value: ['US', 'CA', 'GB', 'DE'],
        },
      ],
      value: true,
    },
  ],
  defaultValue: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Adding Webhooks for Real-Time Updates

Instead of polling, you can notify clients when flags change using webhooks.

```typescript
// webhooks/notifier.ts
class WebhookNotifier {
  private subscribers: Map<string, string[]> = new Map();

  // Register a webhook URL for flag change notifications
  subscribe(flagKey: string, webhookUrl: string): void {
    const urls = this.subscribers.get(flagKey) || [];
    if (!urls.includes(webhookUrl)) {
      urls.push(webhookUrl);
      this.subscribers.set(flagKey, urls);
    }
  }

  // Notify all subscribers when a flag changes
  async notifyFlagChange(flag: FeatureFlag): Promise<void> {
    const urls = this.subscribers.get(flag.key) || [];
    const payload = {
      event: 'flag_updated',
      flag: {
        key: flag.key,
        enabled: flag.enabled,
        updatedAt: flag.updatedAt,
      },
      timestamp: new Date().toISOString(),
    };

    const notifications = urls.map(async (url) => {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error(`Failed to notify ${url}:`, error);
      }
    });

    await Promise.allSettled(notifications);
  }
}

export const webhookNotifier = new WebhookNotifier();
```

## Summary

Building your own feature flag service gives you complete control over how features roll out to users. The core components are:

| Component | Purpose |
|-----------|---------|
| **Data model** | Define flags with rules and conditions |
| **Storage layer** | Persist flags to database or file |
| **Evaluator** | Match rules against context with percentage rollouts |
| **REST API** | Create, update, and evaluate flags |
| **Client SDK** | Cache and fetch flags in applications |

This foundation can be extended with audit logging, flag dependencies, scheduled rollouts, and integration with CI/CD pipelines. The consistent hashing approach ensures users get the same flag value across requests, which is critical for A/B testing and gradual rollouts.
