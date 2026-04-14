# How to Use Feature Flags with Dapr Configuration API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Feature Flag, Configuration API, Progressive Delivery, Microservice

Description: Learn how to implement feature flags using the Dapr Configuration API to enable gradual rollouts and runtime behavior control without redeployments.

---

Feature flags are a powerful technique for decoupling deployment from release. Dapr's Configuration API with real-time subscription support makes it easy to build a lightweight feature flag system that works across your entire microservices fleet.

## Setting Up Feature Flags in Redis

Use a consistent naming convention for feature flag keys:

```bash
# Boolean flags
redis-cli SET ff.new-checkout-flow "false"
redis-cli SET ff.enhanced-search "true"
redis-cli SET ff.beta-dashboard "false"

# Percentage rollout flags
redis-cli SET ff.new-checkout-flow.rollout-pct "0"

# User-segment flags
redis-cli SET ff.beta-features.allowed-users "user123,user456,user789"
```

## Simple Boolean Feature Flag

```typescript
import { DaprClient } from '@dapr/dapr';

class FeatureFlags {
  private flags: Map<string, string> = new Map();
  private client: DaprClient;
  private readonly store = 'appconfig';

  constructor() {
    this.client = new DaprClient();
  }

  async init(): Promise<void> {
    // Load initial state
    const config = await this.client.configuration.get(
      this.store,
      ['ff.new-checkout-flow', 'ff.enhanced-search', 'ff.beta-dashboard']
    );
    for (const [key, item] of Object.entries(config.items)) {
      this.flags.set(key, item.value);
    }

    // Subscribe to changes
    await this.client.configuration.subscribeWithKeys(
      this.store,
      Array.from(this.flags.keys()),
      async (update) => {
        for (const [key, item] of Object.entries(update.items)) {
          this.flags.set(key, item.value);
          console.log(`Feature flag ${key} changed to ${item.value}`);
        }
      }
    );
  }

  isEnabled(flagName: string): boolean {
    return this.flags.get(`ff.${flagName}`) === 'true';
  }
}

const flags = new FeatureFlags();
await flags.init();

// In route handler
app.get('/checkout', async (req, res) => {
  if (flags.isEnabled('new-checkout-flow')) {
    return newCheckoutHandler(req, res);
  }
  return legacyCheckoutHandler(req, res);
});
```

## Percentage-Based Rollout

```python
import hashlib
import httpx

def get_rollout_pct(flag_name: str) -> int:
    resp = httpx.get(
        f"http://localhost:3500/v1.0/configuration/appconfig",
        params={"key": f"ff.{flag_name}.rollout-pct"}
    )
    data = resp.json()
    item = data.get(f"ff.{flag_name}.rollout-pct", {})
    return int(item.get("value", "0"))

def is_flag_enabled_for_user(flag_name: str, user_id: str) -> bool:
    rollout_pct = get_rollout_pct(flag_name)
    if rollout_pct == 0:
        return False
    if rollout_pct == 100:
        return True

    # Consistent hashing for stable rollout
    hash_val = int(hashlib.md5(f"{flag_name}:{user_id}".encode()).hexdigest(), 16)
    bucket = hash_val % 100
    return bucket < rollout_pct
```

## Enabling Flags at Runtime

```bash
# Enable new checkout flow for 10% of users
redis-cli SET ff.new-checkout-flow "true"
redis-cli SET ff.new-checkout-flow.rollout-pct "10"

# Increase to 50%
redis-cli SET ff.new-checkout-flow.rollout-pct "50"

# Full rollout
redis-cli SET ff.new-checkout-flow.rollout-pct "100"

# Emergency kill switch
redis-cli SET ff.new-checkout-flow "false"
```

## Monitoring Flag Usage

Track which code paths are hit to measure rollout impact:

```python
from prometheus_client import Counter

flag_usage = Counter(
    'feature_flag_evaluation_total',
    'Feature flag evaluation counts',
    ['flag', 'result']
)

def evaluate_flag(flag_name: str, user_id: str) -> bool:
    enabled = is_flag_enabled_for_user(flag_name, user_id)
    flag_usage.labels(flag=flag_name, result=str(enabled)).inc()
    return enabled
```

## Summary

The Dapr Configuration API provides a practical foundation for feature flags by storing flag state in Redis, subscribing to real-time changes, and implementing percentage-based rollout logic in your application. This approach is significantly simpler than integrating a dedicated feature flag service while still supporting the key use cases of progressive delivery and emergency kill switches.
