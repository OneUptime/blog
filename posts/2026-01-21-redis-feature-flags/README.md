# How to Implement Feature Flags with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Feature Flags, A/B Testing, Configuration, Python, Node.js

Description: A comprehensive guide to implementing feature flags with Redis, covering boolean flags, percentage rollouts, user targeting, A/B testing, and production best practices.

---

Feature flags (also known as feature toggles) are a powerful technique for controlling feature releases, running experiments, and managing application behavior without deploying new code. Redis is an excellent backend for feature flags due to its speed, flexibility, and support for real-time updates.

In this guide, we will build a complete feature flag system using Redis, covering various flag types, targeting rules, A/B testing, and production considerations.

## Why Redis for Feature Flags?

Redis offers several advantages for feature flag implementations:

- **Low Latency**: Sub-millisecond reads ensure feature checks do not slow down your application
- **Real-Time Updates**: Changes propagate instantly without restarts
- **Pub/Sub**: Notify services when flags change
- **Data Structures**: Hashes, sets, and sorted sets for complex targeting rules
- **Persistence**: Flags survive restarts with RDB/AOF
- **Scalability**: Redis Cluster for high-availability deployments

## Feature Flag Types

Before implementing, let us understand the common types of feature flags:

1. **Boolean Flags**: Simple on/off switches
2. **Percentage Rollouts**: Enable for a percentage of users
3. **User Targeting**: Enable for specific users or groups
4. **Variant Flags**: A/B testing with multiple variants

## Basic Implementation in Python

### Simple Boolean Flags

```python
import redis
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class FlagStatus(Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    PERCENTAGE = "percentage"
    TARGETED = "targeted"

@dataclass
class FeatureFlag:
    name: str
    status: str
    description: str = ""
    percentage: float = 0
    allowed_users: List[str] = None
    allowed_groups: List[str] = None
    variants: Dict[str, int] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.allowed_users is None:
            self.allowed_users = []
        if self.allowed_groups is None:
            self.allowed_groups = []
        if self.variants is None:
            self.variants = {}
        if self.metadata is None:
            self.metadata = {}

class FeatureFlagManager:
    FLAGS_KEY = "feature_flags"
    FLAGS_HASH_KEY = "feature_flags:data"

    def create_flag(self, flag: FeatureFlag) -> bool:
        """Create or update a feature flag."""
        flag_data = {
            "name": flag.name,
            "status": flag.status,
            "description": flag.description,
            "percentage": flag.percentage,
            "allowed_users": json.dumps(flag.allowed_users),
            "allowed_groups": json.dumps(flag.allowed_groups),
            "variants": json.dumps(flag.variants),
            "metadata": json.dumps(flag.metadata)
        }

        pipe = r.pipeline()
        pipe.hset(f"{self.FLAGS_HASH_KEY}:{flag.name}", mapping=flag_data)
        pipe.sadd(self.FLAGS_KEY, flag.name)
        pipe.execute()

        # Publish change notification
        r.publish("feature_flags:changes", json.dumps({
            "action": "update",
            "flag": flag.name
        }))

        return True

    def get_flag(self, flag_name: str) -> Optional[FeatureFlag]:
        """Get a feature flag by name."""
        flag_data = r.hgetall(f"{self.FLAGS_HASH_KEY}:{flag_name}")

        if not flag_data:
            return None

        return FeatureFlag(
            name=flag_data["name"],
            status=flag_data["status"],
            description=flag_data.get("description", ""),
            percentage=float(flag_data.get("percentage", 0)),
            allowed_users=json.loads(flag_data.get("allowed_users", "[]")),
            allowed_groups=json.loads(flag_data.get("allowed_groups", "[]")),
            variants=json.loads(flag_data.get("variants", "{}")),
            metadata=json.loads(flag_data.get("metadata", "{}"))
        )

    def delete_flag(self, flag_name: str) -> bool:
        """Delete a feature flag."""
        pipe = r.pipeline()
        pipe.delete(f"{self.FLAGS_HASH_KEY}:{flag_name}")
        pipe.srem(self.FLAGS_KEY, flag_name)
        pipe.execute()

        r.publish("feature_flags:changes", json.dumps({
            "action": "delete",
            "flag": flag_name
        }))

        return True

    def list_flags(self) -> List[str]:
        """List all feature flag names."""
        return list(r.smembers(self.FLAGS_KEY))

    def is_enabled(self, flag_name: str, user_id: str = None,
                   user_groups: List[str] = None) -> bool:
        """Check if a feature flag is enabled for a user."""
        flag = self.get_flag(flag_name)

        if not flag:
            return False

        # Simple enabled/disabled
        if flag.status == FlagStatus.ENABLED.value:
            return True
        if flag.status == FlagStatus.DISABLED.value:
            return False

        # User targeting
        if flag.status == FlagStatus.TARGETED.value:
            if user_id and user_id in flag.allowed_users:
                return True
            if user_groups:
                for group in user_groups:
                    if group in flag.allowed_groups:
                        return True
            return False

        # Percentage rollout
        if flag.status == FlagStatus.PERCENTAGE.value:
            if not user_id:
                return False
            # Consistent hashing for user
            hash_value = self._hash_user(flag_name, user_id)
            return hash_value < flag.percentage

        return False

    def _hash_user(self, flag_name: str, user_id: str) -> float:
        """Generate a consistent hash for percentage rollouts."""
        import hashlib
        combined = f"{flag_name}:{user_id}"
        hash_bytes = hashlib.md5(combined.encode()).digest()
        # Convert first 4 bytes to integer and normalize to 0-100
        hash_int = int.from_bytes(hash_bytes[:4], byteorder='big')
        return (hash_int / (2**32)) * 100

    def get_variant(self, flag_name: str, user_id: str) -> Optional[str]:
        """Get the variant for A/B testing."""
        flag = self.get_flag(flag_name)

        if not flag or not flag.variants:
            return None

        # Calculate consistent variant assignment
        hash_value = self._hash_user(flag_name, user_id)

        cumulative = 0
        for variant_name, percentage in flag.variants.items():
            cumulative += percentage
            if hash_value < cumulative:
                return variant_name

        # Return first variant as fallback
        return list(flag.variants.keys())[0] if flag.variants else None


# Usage
manager = FeatureFlagManager()

# Create a simple boolean flag
manager.create_flag(FeatureFlag(
    name="new_checkout_flow",
    status="enabled",
    description="New streamlined checkout experience"
))

# Create a percentage rollout
manager.create_flag(FeatureFlag(
    name="dark_mode",
    status="percentage",
    description="Dark mode UI",
    percentage=25  # Enable for 25% of users
))

# Create a targeted flag
manager.create_flag(FeatureFlag(
    name="beta_features",
    status="targeted",
    description="Beta features for early adopters",
    allowed_users=["user_123", "user_456"],
    allowed_groups=["beta_testers", "employees"]
))

# Create an A/B test
manager.create_flag(FeatureFlag(
    name="pricing_page_experiment",
    status="enabled",
    description="A/B test for pricing page layout",
    variants={
        "control": 50,
        "variant_a": 25,
        "variant_b": 25
    }
))

# Check flags
print(f"New checkout enabled: {manager.is_enabled('new_checkout_flow')}")
print(f"Dark mode for user_001: {manager.is_enabled('dark_mode', 'user_001')}")
print(f"Beta for user_123: {manager.is_enabled('beta_features', 'user_123')}")
print(f"Pricing variant for user_789: {manager.get_variant('pricing_page_experiment', 'user_789')}")
```

## Advanced Targeting Rules

Implement complex targeting with conditions:

```python
from dataclasses import dataclass
from typing import Any, Callable
import operator

@dataclass
class TargetingRule:
    attribute: str
    operator: str
    value: Any

class AdvancedFeatureFlags:
    OPERATORS = {
        "eq": operator.eq,
        "ne": operator.ne,
        "gt": operator.gt,
        "gte": operator.ge,
        "lt": operator.lt,
        "lte": operator.le,
        "in": lambda a, b: a in b,
        "not_in": lambda a, b: a not in b,
        "contains": lambda a, b: b in a,
        "starts_with": lambda a, b: str(a).startswith(str(b)),
        "ends_with": lambda a, b: str(a).endswith(str(b)),
    }

    def __init__(self):
        self.manager = FeatureFlagManager()

    def create_flag_with_rules(self, flag_name: str, rules: List[dict],
                               match_type: str = "all") -> bool:
        """Create a flag with complex targeting rules."""
        flag_data = {
            "rules": json.dumps(rules),
            "match_type": match_type  # "all" or "any"
        }

        r.hset(f"feature_flags:rules:{flag_name}", mapping=flag_data)
        return True

    def evaluate_rules(self, flag_name: str,
                       user_context: Dict[str, Any]) -> bool:
        """Evaluate targeting rules against user context."""
        rules_data = r.hgetall(f"feature_flags:rules:{flag_name}")

        if not rules_data:
            return False

        rules = json.loads(rules_data.get("rules", "[]"))
        match_type = rules_data.get("match_type", "all")

        if not rules:
            return True  # No rules means enabled

        results = []
        for rule in rules:
            attribute = rule.get("attribute")
            op_name = rule.get("operator")
            expected_value = rule.get("value")

            actual_value = user_context.get(attribute)

            if actual_value is None:
                results.append(False)
                continue

            op_func = self.OPERATORS.get(op_name)
            if op_func:
                try:
                    results.append(op_func(actual_value, expected_value))
                except (TypeError, ValueError):
                    results.append(False)
            else:
                results.append(False)

        if match_type == "all":
            return all(results)
        else:  # "any"
            return any(results)

    def is_enabled_with_context(self, flag_name: str,
                                 user_context: Dict[str, Any]) -> bool:
        """Check if flag is enabled with full context evaluation."""
        # First check basic flag status
        flag = self.manager.get_flag(flag_name)

        if not flag:
            return False

        if flag.status == "disabled":
            return False

        if flag.status == "enabled":
            # Check rules if they exist
            return self.evaluate_rules(flag_name, user_context)

        # Check user targeting
        user_id = user_context.get("user_id")
        if user_id and user_id in flag.allowed_users:
            return True

        user_groups = user_context.get("groups", [])
        for group in user_groups:
            if group in flag.allowed_groups:
                return True

        # Check percentage
        if flag.status == "percentage" and user_id:
            hash_value = self.manager._hash_user(flag_name, user_id)
            if hash_value < flag.percentage:
                return self.evaluate_rules(flag_name, user_context)

        return False


# Usage with complex rules
advanced = AdvancedFeatureFlags()

# Create flag with targeting rules
advanced.create_flag_with_rules(
    "premium_analytics",
    rules=[
        {"attribute": "plan", "operator": "in", "value": ["pro", "enterprise"]},
        {"attribute": "account_age_days", "operator": "gte", "value": 30}
    ],
    match_type="all"
)

# Evaluate with user context
user_context = {
    "user_id": "user_123",
    "plan": "pro",
    "account_age_days": 45,
    "country": "US",
    "groups": ["beta_testers"]
}

enabled = advanced.is_enabled_with_context("premium_analytics", user_context)
print(f"Premium analytics enabled: {enabled}")
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

class FeatureFlagManager {
  constructor() {
    this.flagsKey = 'feature_flags';
    this.flagsHashKey = 'feature_flags:data';
  }

  async createFlag(flag) {
    const flagData = {
      name: flag.name,
      status: flag.status,
      description: flag.description || '',
      percentage: flag.percentage || 0,
      allowedUsers: JSON.stringify(flag.allowedUsers || []),
      allowedGroups: JSON.stringify(flag.allowedGroups || []),
      variants: JSON.stringify(flag.variants || {}),
      metadata: JSON.stringify(flag.metadata || {})
    };

    const pipeline = redis.pipeline();
    pipeline.hset(`${this.flagsHashKey}:${flag.name}`, flagData);
    pipeline.sadd(this.flagsKey, flag.name);
    await pipeline.exec();

    // Publish change notification
    await redis.publish('feature_flags:changes', JSON.stringify({
      action: 'update',
      flag: flag.name
    }));

    return true;
  }

  async getFlag(flagName) {
    const flagData = await redis.hgetall(`${this.flagsHashKey}:${flagName}`);

    if (!flagData || Object.keys(flagData).length === 0) {
      return null;
    }

    return {
      name: flagData.name,
      status: flagData.status,
      description: flagData.description,
      percentage: parseFloat(flagData.percentage),
      allowedUsers: JSON.parse(flagData.allowedUsers || '[]'),
      allowedGroups: JSON.parse(flagData.allowedGroups || '[]'),
      variants: JSON.parse(flagData.variants || '{}'),
      metadata: JSON.parse(flagData.metadata || '{}')
    };
  }

  async isEnabled(flagName, userId = null, userGroups = []) {
    const flag = await this.getFlag(flagName);

    if (!flag) {
      return false;
    }

    switch (flag.status) {
      case 'enabled':
        return true;
      case 'disabled':
        return false;
      case 'targeted':
        if (userId && flag.allowedUsers.includes(userId)) {
          return true;
        }
        for (const group of userGroups) {
          if (flag.allowedGroups.includes(group)) {
            return true;
          }
        }
        return false;
      case 'percentage':
        if (!userId) {
          return false;
        }
        const hashValue = this.hashUser(flagName, userId);
        return hashValue < flag.percentage;
      default:
        return false;
    }
  }

  hashUser(flagName, userId) {
    const combined = `${flagName}:${userId}`;
    const hash = crypto.createHash('md5').update(combined).digest();
    const hashInt = hash.readUInt32BE(0);
    return (hashInt / 0xFFFFFFFF) * 100;
  }

  async getVariant(flagName, userId) {
    const flag = await this.getFlag(flagName);

    if (!flag || !flag.variants || Object.keys(flag.variants).length === 0) {
      return null;
    }

    const hashValue = this.hashUser(flagName, userId);

    let cumulative = 0;
    for (const [variantName, percentage] of Object.entries(flag.variants)) {
      cumulative += percentage;
      if (hashValue < cumulative) {
        return variantName;
      }
    }

    return Object.keys(flag.variants)[0];
  }

  async deleteFlag(flagName) {
    const pipeline = redis.pipeline();
    pipeline.del(`${this.flagsHashKey}:${flagName}`);
    pipeline.srem(this.flagsKey, flagName);
    await pipeline.exec();

    await redis.publish('feature_flags:changes', JSON.stringify({
      action: 'delete',
      flag: flagName
    }));

    return true;
  }

  async listFlags() {
    return redis.smembers(this.flagsKey);
  }
}

// Express.js middleware for feature flags
const express = require('express');
const app = express();

const flagManager = new FeatureFlagManager();

// Middleware to attach feature flags to request
app.use(async (req, res, next) => {
  const userId = req.user?.id || req.session?.userId;
  const userGroups = req.user?.groups || [];

  req.featureFlags = {
    isEnabled: async (flagName) => {
      return flagManager.isEnabled(flagName, userId, userGroups);
    },
    getVariant: async (flagName) => {
      return flagManager.getVariant(flagName, userId);
    }
  };

  next();
});

// Usage in routes
app.get('/dashboard', async (req, res) => {
  const showNewDashboard = await req.featureFlags.isEnabled('new_dashboard');
  const pricingVariant = await req.featureFlags.getVariant('pricing_experiment');

  res.render('dashboard', {
    showNewDashboard,
    pricingVariant
  });
});

// Admin API for managing flags
app.post('/api/admin/flags', async (req, res) => {
  await flagManager.createFlag(req.body);
  res.json({ success: true });
});

app.get('/api/admin/flags', async (req, res) => {
  const flags = await flagManager.listFlags();
  res.json({ flags });
});

app.delete('/api/admin/flags/:name', async (req, res) => {
  await flagManager.deleteFlag(req.params.name);
  res.json({ success: true });
});
```

## Caching and Performance

For high-traffic applications, implement local caching with Redis Pub/Sub for invalidation:

```python
import threading
import time
from functools import lru_cache

class CachedFeatureFlags:
    def __init__(self, cache_ttl: int = 60):
        self.manager = FeatureFlagManager()
        self.cache_ttl = cache_ttl
        self._cache = {}
        self._cache_timestamps = {}
        self._lock = threading.Lock()

        # Start background subscriber for cache invalidation
        self._start_subscriber()

    def _start_subscriber(self):
        def subscriber():
            pubsub = r.pubsub()
            pubsub.subscribe("feature_flags:changes")

            for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    flag_name = data.get("flag")

                    with self._lock:
                        if flag_name in self._cache:
                            del self._cache[flag_name]
                            del self._cache_timestamps[flag_name]

        thread = threading.Thread(target=subscriber, daemon=True)
        thread.start()

    def get_flag(self, flag_name: str) -> Optional[FeatureFlag]:
        """Get flag with local caching."""
        current_time = time.time()

        with self._lock:
            # Check cache
            if flag_name in self._cache:
                if current_time - self._cache_timestamps[flag_name] < self.cache_ttl:
                    return self._cache[flag_name]

            # Fetch from Redis
            flag = self.manager.get_flag(flag_name)

            # Update cache
            self._cache[flag_name] = flag
            self._cache_timestamps[flag_name] = current_time

            return flag

    def is_enabled(self, flag_name: str, user_id: str = None,
                   user_groups: List[str] = None) -> bool:
        """Check if flag is enabled with caching."""
        flag = self.get_flag(flag_name)

        if not flag:
            return False

        if flag.status == FlagStatus.ENABLED.value:
            return True
        if flag.status == FlagStatus.DISABLED.value:
            return False

        if flag.status == FlagStatus.TARGETED.value:
            if user_id and user_id in flag.allowed_users:
                return True
            if user_groups:
                for group in user_groups:
                    if group in flag.allowed_groups:
                        return True
            return False

        if flag.status == FlagStatus.PERCENTAGE.value:
            if not user_id:
                return False
            hash_value = self.manager._hash_user(flag_name, user_id)
            return hash_value < flag.percentage

        return False


# Singleton for application-wide use
_cached_flags = None

def get_feature_flags() -> CachedFeatureFlags:
    global _cached_flags
    if _cached_flags is None:
        _cached_flags = CachedFeatureFlags(cache_ttl=60)
    return _cached_flags

# Usage
flags = get_feature_flags()
if flags.is_enabled("new_feature", user_id="user_123"):
    # Show new feature
    pass
```

## A/B Testing with Analytics

Track experiment exposure and outcomes:

```python
class ExperimentTracker:
    def __init__(self, flag_manager: FeatureFlagManager):
        self.manager = flag_manager

    def track_exposure(self, experiment_name: str, user_id: str,
                       variant: str) -> None:
        """Track when a user is exposed to an experiment variant."""
        today = datetime.now().strftime("%Y-%m-%d")

        pipe = r.pipeline()

        # Track exposure count per variant
        pipe.hincrby(
            f"experiment:{experiment_name}:exposures:{today}",
            variant,
            1
        )

        # Track unique users per variant (HyperLogLog)
        pipe.pfadd(
            f"experiment:{experiment_name}:users:{variant}:{today}",
            user_id
        )

        # Store user's variant assignment
        pipe.hset(
            f"experiment:{experiment_name}:assignments",
            user_id,
            variant
        )

        pipe.execute()

    def track_conversion(self, experiment_name: str, user_id: str,
                        conversion_type: str, value: float = 1.0) -> None:
        """Track a conversion event for an experiment."""
        today = datetime.now().strftime("%Y-%m-%d")

        # Get user's variant assignment
        variant = r.hget(
            f"experiment:{experiment_name}:assignments",
            user_id
        )

        if not variant:
            return  # User not in experiment

        pipe = r.pipeline()

        # Track conversion count
        pipe.hincrby(
            f"experiment:{experiment_name}:conversions:{conversion_type}:{today}",
            variant,
            1
        )

        # Track conversion value
        pipe.hincrbyfloat(
            f"experiment:{experiment_name}:value:{conversion_type}:{today}",
            variant,
            value
        )

        # Track unique converters
        pipe.pfadd(
            f"experiment:{experiment_name}:converters:{conversion_type}:{variant}:{today}",
            user_id
        )

        pipe.execute()

    def get_experiment_results(self, experiment_name: str,
                               date: str = None) -> dict:
        """Get experiment results for analysis."""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        results = {}

        # Get exposure data
        exposures = r.hgetall(f"experiment:{experiment_name}:exposures:{date}")

        for variant in exposures.keys():
            results[variant] = {
                "exposures": int(exposures.get(variant, 0)),
                "unique_users": r.pfcount(
                    f"experiment:{experiment_name}:users:{variant}:{date}"
                ),
                "conversions": {},
            }

        # Get conversion data for common types
        conversion_types = ["signup", "purchase", "click"]
        for conv_type in conversion_types:
            conversions = r.hgetall(
                f"experiment:{experiment_name}:conversions:{conv_type}:{date}"
            )
            values = r.hgetall(
                f"experiment:{experiment_name}:value:{conv_type}:{date}"
            )

            for variant in results.keys():
                count = int(conversions.get(variant, 0))
                value = float(values.get(variant, 0))
                unique = r.pfcount(
                    f"experiment:{experiment_name}:converters:{conv_type}:{variant}:{date}"
                )

                results[variant]["conversions"][conv_type] = {
                    "count": count,
                    "value": value,
                    "unique_converters": unique,
                    "conversion_rate": (unique / results[variant]["unique_users"] * 100)
                        if results[variant]["unique_users"] > 0 else 0
                }

        return results


# Usage
tracker = ExperimentTracker(manager)

# When showing the experiment to a user
variant = manager.get_variant("pricing_page_experiment", "user_789")
tracker.track_exposure("pricing_page_experiment", "user_789", variant)

# When user converts
tracker.track_conversion("pricing_page_experiment", "user_789", "purchase", 99.99)

# Get results
results = tracker.get_experiment_results("pricing_page_experiment")
print(json.dumps(results, indent=2))
```

## Gradual Rollout Strategy

Implement a safe rollout process:

```python
class GradualRollout:
    def __init__(self, flag_manager: FeatureFlagManager):
        self.manager = flag_manager

    def create_rollout(self, flag_name: str, stages: List[dict]) -> None:
        """Create a gradual rollout plan."""
        rollout_data = {
            "flag_name": flag_name,
            "stages": json.dumps(stages),
            "current_stage": 0,
            "status": "active",
            "created_at": datetime.now().isoformat()
        }

        r.hset(f"rollout:{flag_name}", mapping=rollout_data)

    def advance_rollout(self, flag_name: str) -> dict:
        """Advance to the next rollout stage."""
        rollout_data = r.hgetall(f"rollout:{flag_name}")

        if not rollout_data:
            return {"error": "Rollout not found"}

        stages = json.loads(rollout_data["stages"])
        current_stage = int(rollout_data["current_stage"])

        if current_stage >= len(stages) - 1:
            return {"error": "Already at final stage"}

        next_stage = current_stage + 1
        next_config = stages[next_stage]

        # Update the feature flag
        flag = self.manager.get_flag(flag_name)
        if flag:
            flag.percentage = next_config.get("percentage", flag.percentage)
            flag.allowed_groups = next_config.get("groups", flag.allowed_groups)
            self.manager.create_flag(flag)

        # Update rollout progress
        r.hset(f"rollout:{flag_name}", "current_stage", next_stage)

        return {
            "success": True,
            "stage": next_stage,
            "config": next_config
        }

    def rollback(self, flag_name: str) -> dict:
        """Rollback to the previous stage."""
        rollout_data = r.hgetall(f"rollout:{flag_name}")

        if not rollout_data:
            return {"error": "Rollout not found"}

        stages = json.loads(rollout_data["stages"])
        current_stage = int(rollout_data["current_stage"])

        if current_stage <= 0:
            # Disable the flag completely
            flag = self.manager.get_flag(flag_name)
            if flag:
                flag.status = "disabled"
                self.manager.create_flag(flag)
            return {"success": True, "action": "disabled"}

        prev_stage = current_stage - 1
        prev_config = stages[prev_stage]

        # Update the feature flag
        flag = self.manager.get_flag(flag_name)
        if flag:
            flag.percentage = prev_config.get("percentage", flag.percentage)
            flag.allowed_groups = prev_config.get("groups", flag.allowed_groups)
            self.manager.create_flag(flag)

        # Update rollout progress
        r.hset(f"rollout:{flag_name}", "current_stage", prev_stage)

        return {
            "success": True,
            "stage": prev_stage,
            "config": prev_config
        }


# Usage
rollout = GradualRollout(manager)

# Create a multi-stage rollout plan
rollout.create_rollout("new_payment_system", [
    {"percentage": 0, "groups": ["internal"]},      # Stage 0: Internal only
    {"percentage": 5, "groups": ["internal"]},      # Stage 1: 5% + internal
    {"percentage": 25, "groups": []},               # Stage 2: 25%
    {"percentage": 50, "groups": []},               # Stage 3: 50%
    {"percentage": 100, "groups": []}               # Stage 4: 100%
])

# Advance through stages
rollout.advance_rollout("new_payment_system")  # Move to stage 1
rollout.advance_rollout("new_payment_system")  # Move to stage 2

# If issues detected
rollout.rollback("new_payment_system")  # Go back to stage 1
```

## Conclusion

Redis provides an excellent foundation for feature flag systems with its speed, flexibility, and real-time capabilities. Key takeaways:

- Use **hashes** for storing flag configurations
- Implement **consistent hashing** for percentage rollouts
- Use **Pub/Sub** for real-time flag updates across services
- Implement **local caching** for high-traffic applications
- Track **experiment exposure and conversions** for A/B testing
- Use **gradual rollouts** for safe feature releases
- Design **targeting rules** for precise user segmentation

With these patterns, you can build a feature flag system that supports rapid experimentation and safe deployments while maintaining high performance.

## Related Resources

- [Feature Toggles (Martin Fowler)](https://martinfowler.com/articles/feature-toggles.html)
- [Redis Hash Commands](https://redis.io/commands/?group=hash)
- [Redis Pub/Sub Documentation](https://redis.io/docs/interact/pubsub/)
