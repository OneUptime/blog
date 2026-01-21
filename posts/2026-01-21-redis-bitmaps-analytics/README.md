# How to Use Redis Bitmaps for Analytics and Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitmaps, Analytics, Feature Flags, User Activity, Memory Efficient, SETBIT, GETBIT, BITCOUNT

Description: A comprehensive guide to using Redis Bitmaps for analytics and feature flags, covering SETBIT, GETBIT, BITCOUNT, BITOP commands, and practical examples in Python, Node.js, and Go for user activity tracking, feature flags, and real-time analytics.

---

Redis Bitmaps are not a separate data type but rather a set of bit-oriented operations on String values. Each string can store up to 512 MB, meaning you can address up to 2^32 different bits. This makes bitmaps incredibly memory-efficient for tracking binary states across large populations.

In this guide, we will explore Redis Bitmaps in depth, covering essential commands, bit operations, and practical implementations for analytics, feature flags, and user activity tracking.

## Understanding Redis Bitmaps

A bitmap is essentially an array of bits where each bit can be 0 or 1. Redis stores bitmaps as strings, allowing you to:

- Address individual bits by offset
- Perform bitwise operations (AND, OR, XOR, NOT)
- Count set bits efficiently

Memory efficiency example:
- Tracking 100 million users' daily login: ~12.5 MB
- Same with a Set: ~400 MB (assuming 4-byte user IDs)

Use cases:
- Daily/weekly/monthly active users
- Feature flags
- User permissions
- Online/offline status
- Real-time analytics
- Bloom filters

## Essential Bitmap Commands

### SETBIT and GETBIT

```bash
# Set bit at offset
SETBIT user:logins:2024-01-15 12345 1
# Sets bit at position 12345 to 1

# Get bit at offset
GETBIT user:logins:2024-01-15 12345
# Returns 1

GETBIT user:logins:2024-01-15 99999
# Returns 0 (unset bits default to 0)
```

### BITCOUNT

```bash
# Count all set bits
BITCOUNT user:logins:2024-01-15
# Returns total number of 1s

# Count bits in byte range
BITCOUNT user:logins:2024-01-15 0 10
# Count bits in bytes 0-10

# Count bits with BIT modifier (Redis 7.0+)
BITCOUNT user:logins:2024-01-15 0 100 BIT
# Count bits in bit range 0-100
```

### BITPOS

```bash
# Find first bit set to 1
BITPOS user:logins:2024-01-15 1
# Returns offset of first 1

# Find first bit set to 0
BITPOS user:logins:2024-01-15 0
# Returns offset of first 0

# Search within range
BITPOS user:logins:2024-01-15 1 0 10
# Search in bytes 0-10
```

### BITOP - Bitwise Operations

```bash
# AND - users active on BOTH days
BITOP AND active:both logins:2024-01-14 logins:2024-01-15

# OR - users active on EITHER day
BITOP OR active:either logins:2024-01-14 logins:2024-01-15

# XOR - users active on exactly ONE day
BITOP XOR active:one logins:2024-01-14 logins:2024-01-15

# NOT - users NOT active
BITOP NOT inactive:2024-01-15 logins:2024-01-15
```

### BITFIELD - Advanced Operations

```bash
# Set and get multiple bits
BITFIELD mybitmap SET u8 0 200
# Set unsigned 8-bit integer at offset 0 to 200

BITFIELD mybitmap GET u8 0
# Get unsigned 8-bit integer at offset 0

# Increment
BITFIELD mybitmap INCRBY u8 0 1
# Increment by 1

# Multiple operations
BITFIELD mybitmap SET u4 0 1 SET u4 4 2 GET u4 0 GET u4 4
```

## Practical Examples

### Python Implementation

```python
import redis
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional
import math

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Daily Active Users (DAU) Tracking
# =============================================================================

class ActiveUserTracker:
    def __init__(self, namespace: str = "active"):
        self.namespace = namespace

    def _daily_key(self, date: datetime) -> str:
        return f"{self.namespace}:daily:{date.strftime('%Y-%m-%d')}"

    def _monthly_key(self, date: datetime) -> str:
        return f"{self.namespace}:monthly:{date.strftime('%Y-%m')}"

    def track_activity(self, user_id: int, timestamp: datetime = None) -> None:
        """Track user activity."""
        if timestamp is None:
            timestamp = datetime.now()

        # Set bit for user ID
        client.setbit(self._daily_key(timestamp), user_id, 1)
        client.setbit(self._monthly_key(timestamp), user_id, 1)

    def was_active(self, user_id: int, date: datetime) -> bool:
        """Check if user was active on date."""
        return client.getbit(self._daily_key(date), user_id) == 1

    def get_dau(self, date: datetime) -> int:
        """Get Daily Active Users count."""
        return client.bitcount(self._daily_key(date))

    def get_mau(self, date: datetime) -> int:
        """Get Monthly Active Users count."""
        return client.bitcount(self._monthly_key(date))

    def get_wau(self, end_date: datetime) -> int:
        """Get Weekly Active Users count."""
        keys = []
        for i in range(7):
            day = end_date - timedelta(days=i)
            keys.append(self._daily_key(day))

        # OR all daily bitmaps
        result_key = f"{self.namespace}:wau:temp"
        client.bitop("OR", result_key, *keys)
        count = client.bitcount(result_key)
        client.delete(result_key)

        return count

    def get_retention(self, day1: datetime, day2: datetime) -> Dict:
        """Get retention metrics between two days."""
        key1 = self._daily_key(day1)
        key2 = self._daily_key(day2)

        # Users active both days
        result_key = f"{self.namespace}:retention:temp"
        client.bitop("AND", result_key, key1, key2)
        both_days = client.bitcount(result_key)

        # Users active day 1
        day1_users = client.bitcount(key1)

        # Users active day 2
        day2_users = client.bitcount(key2)

        client.delete(result_key)

        return {
            "day1_users": day1_users,
            "day2_users": day2_users,
            "retained_users": both_days,
            "retention_rate": both_days / day1_users if day1_users > 0 else 0
        }

    def get_cohort_analysis(self, start_date: datetime, days: int) -> List[Dict]:
        """Get cohort retention analysis."""
        cohort_key = self._daily_key(start_date)
        cohort_size = client.bitcount(cohort_key)

        results = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            day_key = self._daily_key(day)

            # AND with cohort
            result_key = f"{self.namespace}:cohort:temp"
            client.bitop("AND", result_key, cohort_key, day_key)
            retained = client.bitcount(result_key)
            client.delete(result_key)

            results.append({
                "day": i,
                "date": day.strftime('%Y-%m-%d'),
                "retained": retained,
                "retention_rate": retained / cohort_size if cohort_size > 0 else 0
            })

        return results


# =============================================================================
# Feature Flags
# =============================================================================

class FeatureFlags:
    def __init__(self):
        self.namespace = "features"

    def _key(self, feature: str) -> str:
        return f"{self.namespace}:{feature}"

    def enable_for_user(self, feature: str, user_id: int) -> None:
        """Enable feature for user."""
        client.setbit(self._key(feature), user_id, 1)

    def disable_for_user(self, feature: str, user_id: int) -> None:
        """Disable feature for user."""
        client.setbit(self._key(feature), user_id, 0)

    def is_enabled(self, feature: str, user_id: int) -> bool:
        """Check if feature is enabled for user."""
        return client.getbit(self._key(feature), user_id) == 1

    def enable_for_percentage(self, feature: str, percentage: float, max_user_id: int) -> int:
        """Enable feature for percentage of users (deterministic)."""
        # Enable for user IDs where user_id % 100 < percentage
        threshold = int(percentage)
        enabled_count = 0

        pipe = client.pipeline()
        for user_id in range(max_user_id):
            if user_id % 100 < threshold:
                pipe.setbit(self._key(feature), user_id, 1)
                enabled_count += 1

        pipe.execute()
        return enabled_count

    def get_enabled_count(self, feature: str) -> int:
        """Get count of users with feature enabled."""
        return client.bitcount(self._key(feature))

    def get_users_with_all_features(self, features: List[str]) -> int:
        """Get count of users with all features enabled."""
        if not features:
            return 0

        keys = [self._key(f) for f in features]
        result_key = f"{self.namespace}:intersection:temp"

        client.bitop("AND", result_key, *keys)
        count = client.bitcount(result_key)
        client.delete(result_key)

        return count

    def get_users_with_any_feature(self, features: List[str]) -> int:
        """Get count of users with any feature enabled."""
        if not features:
            return 0

        keys = [self._key(f) for f in features]
        result_key = f"{self.namespace}:union:temp"

        client.bitop("OR", result_key, *keys)
        count = client.bitcount(result_key)
        client.delete(result_key)

        return count


# =============================================================================
# Online Status Tracker
# =============================================================================

class OnlineStatusTracker:
    def __init__(self):
        self.key = "online:users"

    def set_online(self, user_id: int) -> None:
        """Mark user as online."""
        client.setbit(self.key, user_id, 1)

    def set_offline(self, user_id: int) -> None:
        """Mark user as offline."""
        client.setbit(self.key, user_id, 0)

    def is_online(self, user_id: int) -> bool:
        """Check if user is online."""
        return client.getbit(self.key, user_id) == 1

    def get_online_count(self) -> int:
        """Get count of online users."""
        return client.bitcount(self.key)

    def get_online_friends(self, friend_ids: List[int]) -> List[int]:
        """Get list of online friends."""
        return [uid for uid in friend_ids if self.is_online(uid)]


# =============================================================================
# User Permissions
# =============================================================================

class UserPermissions:
    # Define permission bit positions
    PERMISSIONS = {
        "read": 0,
        "write": 1,
        "delete": 2,
        "admin": 3,
        "export": 4,
        "import": 5,
        "audit": 6,
        "settings": 7
    }

    def __init__(self):
        self.namespace = "permissions"

    def _key(self, user_id: int) -> str:
        return f"{self.namespace}:user:{user_id}"

    def grant(self, user_id: int, permission: str) -> None:
        """Grant permission to user."""
        if permission not in self.PERMISSIONS:
            raise ValueError(f"Unknown permission: {permission}")
        offset = self.PERMISSIONS[permission]
        client.setbit(self._key(user_id), offset, 1)

    def revoke(self, user_id: int, permission: str) -> None:
        """Revoke permission from user."""
        if permission not in self.PERMISSIONS:
            raise ValueError(f"Unknown permission: {permission}")
        offset = self.PERMISSIONS[permission]
        client.setbit(self._key(user_id), offset, 0)

    def has_permission(self, user_id: int, permission: str) -> bool:
        """Check if user has permission."""
        if permission not in self.PERMISSIONS:
            raise ValueError(f"Unknown permission: {permission}")
        offset = self.PERMISSIONS[permission]
        return client.getbit(self._key(user_id), offset) == 1

    def get_permissions(self, user_id: int) -> List[str]:
        """Get all permissions for user."""
        return [
            perm for perm, offset in self.PERMISSIONS.items()
            if client.getbit(self._key(user_id), offset) == 1
        ]

    def set_permissions(self, user_id: int, permissions: List[str]) -> None:
        """Set multiple permissions at once."""
        key = self._key(user_id)
        client.delete(key)

        for perm in permissions:
            if perm in self.PERMISSIONS:
                client.setbit(key, self.PERMISSIONS[perm], 1)


# =============================================================================
# Event Occurrence Tracker
# =============================================================================

class EventTracker:
    def __init__(self):
        self.namespace = "events"

    def _key(self, event_type: str, date: datetime) -> str:
        return f"{self.namespace}:{event_type}:{date.strftime('%Y-%m-%d')}"

    def track_event(self, event_type: str, entity_id: int, timestamp: datetime = None) -> None:
        """Track event occurrence."""
        if timestamp is None:
            timestamp = datetime.now()
        client.setbit(self._key(event_type, timestamp), entity_id, 1)

    def has_event(self, event_type: str, entity_id: int, date: datetime) -> bool:
        """Check if entity had event on date."""
        return client.getbit(self._key(event_type, date), entity_id) == 1

    def get_event_count(self, event_type: str, date: datetime) -> int:
        """Get count of entities with event on date."""
        return client.bitcount(self._key(event_type, date))

    def get_events_intersection(self, event_types: List[str], date: datetime) -> int:
        """Get count of entities with all events on date."""
        keys = [self._key(et, date) for et in event_types]
        result_key = f"{self.namespace}:intersection:temp"

        client.bitop("AND", result_key, *keys)
        count = client.bitcount(result_key)
        client.delete(result_key)

        return count


# =============================================================================
# Usage Examples
# =============================================================================

# Active User Tracking
tracker = ActiveUserTracker()
today = datetime.now()
yesterday = today - timedelta(days=1)

# Simulate activity
for user_id in range(1, 10001):
    if user_id % 3 == 0:  # ~33% active today
        tracker.track_activity(user_id, today)
    if user_id % 2 == 0:  # 50% active yesterday
        tracker.track_activity(user_id, yesterday)

print(f"DAU Today: {tracker.get_dau(today)}")
print(f"DAU Yesterday: {tracker.get_dau(yesterday)}")
print(f"WAU: {tracker.get_wau(today)}")
print(f"Retention: {tracker.get_retention(yesterday, today)}")

# Feature Flags
flags = FeatureFlags()
flags.enable_for_user("new_ui", 123)
flags.enable_for_user("new_ui", 456)
flags.enable_for_user("dark_mode", 123)

print(f"User 123 has new_ui: {flags.is_enabled('new_ui', 123)}")
print(f"User 123 has dark_mode: {flags.is_enabled('dark_mode', 123)}")
print(f"Users with new_ui: {flags.get_enabled_count('new_ui')}")

# Online Status
online = OnlineStatusTracker()
online.set_online(123)
online.set_online(456)
online.set_online(789)

print(f"User 123 online: {online.is_online(123)}")
print(f"Online users: {online.get_online_count()}")

# Permissions
perms = UserPermissions()
perms.grant(123, "read")
perms.grant(123, "write")
perms.grant(123, "admin")

print(f"User 123 permissions: {perms.get_permissions(123)}")
print(f"User 123 has admin: {perms.has_permission(123, 'admin')}")
print(f"User 123 has delete: {perms.has_permission(123, 'delete')}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Active User Tracker
// =============================================================================

class ActiveUserTracker {
  constructor(namespace = 'active') {
    this.namespace = namespace;
  }

  _dailyKey(date) {
    return `${this.namespace}:daily:${date.toISOString().split('T')[0]}`;
  }

  _monthlyKey(date) {
    return `${this.namespace}:monthly:${date.toISOString().slice(0, 7)}`;
  }

  async trackActivity(userId, timestamp = new Date()) {
    const pipeline = redis.pipeline();
    pipeline.setbit(this._dailyKey(timestamp), userId, 1);
    pipeline.setbit(this._monthlyKey(timestamp), userId, 1);
    await pipeline.exec();
  }

  async wasActive(userId, date) {
    return (await redis.getbit(this._dailyKey(date), userId)) === 1;
  }

  async getDAU(date) {
    return await redis.bitcount(this._dailyKey(date));
  }

  async getMAU(date) {
    return await redis.bitcount(this._monthlyKey(date));
  }

  async getWAU(endDate) {
    const keys = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(endDate);
      day.setDate(day.getDate() - i);
      keys.push(this._dailyKey(day));
    }

    const resultKey = `${this.namespace}:wau:temp`;
    await redis.bitop('OR', resultKey, ...keys);
    const count = await redis.bitcount(resultKey);
    await redis.del(resultKey);

    return count;
  }

  async getRetention(day1, day2) {
    const key1 = this._dailyKey(day1);
    const key2 = this._dailyKey(day2);

    const resultKey = `${this.namespace}:retention:temp`;
    await redis.bitop('AND', resultKey, key1, key2);
    const bothDays = await redis.bitcount(resultKey);
    await redis.del(resultKey);

    const day1Users = await redis.bitcount(key1);
    const day2Users = await redis.bitcount(key2);

    return {
      day1Users,
      day2Users,
      retainedUsers: bothDays,
      retentionRate: day1Users > 0 ? bothDays / day1Users : 0,
    };
  }
}

// =============================================================================
// Feature Flags
// =============================================================================

class FeatureFlags {
  constructor() {
    this.namespace = 'features';
  }

  _key(feature) {
    return `${this.namespace}:${feature}`;
  }

  async enableForUser(feature, userId) {
    await redis.setbit(this._key(feature), userId, 1);
  }

  async disableForUser(feature, userId) {
    await redis.setbit(this._key(feature), userId, 0);
  }

  async isEnabled(feature, userId) {
    return (await redis.getbit(this._key(feature), userId)) === 1;
  }

  async getEnabledCount(feature) {
    return await redis.bitcount(this._key(feature));
  }

  async getUsersWithAllFeatures(features) {
    if (!features.length) return 0;

    const keys = features.map((f) => this._key(f));
    const resultKey = `${this.namespace}:intersection:temp`;

    await redis.bitop('AND', resultKey, ...keys);
    const count = await redis.bitcount(resultKey);
    await redis.del(resultKey);

    return count;
  }
}

// =============================================================================
// Online Status Tracker
// =============================================================================

class OnlineStatusTracker {
  constructor() {
    this.key = 'online:users';
  }

  async setOnline(userId) {
    await redis.setbit(this.key, userId, 1);
  }

  async setOffline(userId) {
    await redis.setbit(this.key, userId, 0);
  }

  async isOnline(userId) {
    return (await redis.getbit(this.key, userId)) === 1;
  }

  async getOnlineCount() {
    return await redis.bitcount(this.key);
  }
}

// =============================================================================
// User Permissions
// =============================================================================

class UserPermissions {
  static PERMISSIONS = {
    read: 0,
    write: 1,
    delete: 2,
    admin: 3,
    export: 4,
    import: 5,
  };

  constructor() {
    this.namespace = 'permissions';
  }

  _key(userId) {
    return `${this.namespace}:user:${userId}`;
  }

  async grant(userId, permission) {
    const offset = UserPermissions.PERMISSIONS[permission];
    if (offset === undefined) throw new Error(`Unknown permission: ${permission}`);
    await redis.setbit(this._key(userId), offset, 1);
  }

  async revoke(userId, permission) {
    const offset = UserPermissions.PERMISSIONS[permission];
    if (offset === undefined) throw new Error(`Unknown permission: ${permission}`);
    await redis.setbit(this._key(userId), offset, 0);
  }

  async hasPermission(userId, permission) {
    const offset = UserPermissions.PERMISSIONS[permission];
    if (offset === undefined) throw new Error(`Unknown permission: ${permission}`);
    return (await redis.getbit(this._key(userId), offset)) === 1;
  }

  async getPermissions(userId) {
    const permissions = [];
    for (const [perm, offset] of Object.entries(UserPermissions.PERMISSIONS)) {
      if ((await redis.getbit(this._key(userId), offset)) === 1) {
        permissions.push(perm);
      }
    }
    return permissions;
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Active User Tracking
  const tracker = new ActiveUserTracker();

  for (let userId = 1; userId <= 10000; userId++) {
    if (userId % 3 === 0) {
      await tracker.trackActivity(userId, today);
    }
    if (userId % 2 === 0) {
      await tracker.trackActivity(userId, yesterday);
    }
  }

  console.log('DAU Today:', await tracker.getDAU(today));
  console.log('DAU Yesterday:', await tracker.getDAU(yesterday));
  console.log('WAU:', await tracker.getWAU(today));
  console.log('Retention:', await tracker.getRetention(yesterday, today));

  // Feature Flags
  const flags = new FeatureFlags();
  await flags.enableForUser('new_ui', 123);
  await flags.enableForUser('new_ui', 456);
  await flags.enableForUser('dark_mode', 123);

  console.log('User 123 has new_ui:', await flags.isEnabled('new_ui', 123));
  console.log('Users with new_ui:', await flags.getEnabledCount('new_ui'));

  // Online Status
  const online = new OnlineStatusTracker();
  await online.setOnline(123);
  await online.setOnline(456);

  console.log('User 123 online:', await online.isOnline(123));
  console.log('Online users:', await online.getOnlineCount());

  // Permissions
  const perms = new UserPermissions();
  await perms.grant(123, 'read');
  await perms.grant(123, 'write');
  await perms.grant(123, 'admin');

  console.log('User 123 permissions:', await perms.getPermissions(123));
  console.log('User 123 has admin:', await perms.hasPermission(123, 'admin'));

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Active User Tracker
// =============================================================================

type ActiveUserTracker struct {
    Namespace string
}

func NewActiveUserTracker(namespace string) *ActiveUserTracker {
    return &ActiveUserTracker{Namespace: namespace}
}

func (t *ActiveUserTracker) dailyKey(date time.Time) string {
    return fmt.Sprintf("%s:daily:%s", t.Namespace, date.Format("2006-01-02"))
}

func (t *ActiveUserTracker) monthlyKey(date time.Time) string {
    return fmt.Sprintf("%s:monthly:%s", t.Namespace, date.Format("2006-01"))
}

func (t *ActiveUserTracker) TrackActivity(userID int64, timestamp time.Time) error {
    pipe := client.Pipeline()
    pipe.SetBit(ctx, t.dailyKey(timestamp), userID, 1)
    pipe.SetBit(ctx, t.monthlyKey(timestamp), userID, 1)
    _, err := pipe.Exec(ctx)
    return err
}

func (t *ActiveUserTracker) WasActive(userID int64, date time.Time) (bool, error) {
    result, err := client.GetBit(ctx, t.dailyKey(date), userID).Result()
    return result == 1, err
}

func (t *ActiveUserTracker) GetDAU(date time.Time) (int64, error) {
    return client.BitCount(ctx, t.dailyKey(date), nil).Result()
}

func (t *ActiveUserTracker) GetWAU(endDate time.Time) (int64, error) {
    keys := make([]string, 7)
    for i := 0; i < 7; i++ {
        day := endDate.AddDate(0, 0, -i)
        keys[i] = t.dailyKey(day)
    }

    resultKey := fmt.Sprintf("%s:wau:temp", t.Namespace)
    client.BitOpOr(ctx, resultKey, keys...)
    count, err := client.BitCount(ctx, resultKey, nil).Result()
    client.Del(ctx, resultKey)

    return count, err
}

type RetentionResult struct {
    Day1Users     int64
    Day2Users     int64
    RetainedUsers int64
    RetentionRate float64
}

func (t *ActiveUserTracker) GetRetention(day1, day2 time.Time) (*RetentionResult, error) {
    key1 := t.dailyKey(day1)
    key2 := t.dailyKey(day2)
    resultKey := fmt.Sprintf("%s:retention:temp", t.Namespace)

    client.BitOpAnd(ctx, resultKey, key1, key2)
    bothDays, _ := client.BitCount(ctx, resultKey, nil).Result()
    client.Del(ctx, resultKey)

    day1Users, _ := client.BitCount(ctx, key1, nil).Result()
    day2Users, _ := client.BitCount(ctx, key2, nil).Result()

    retentionRate := 0.0
    if day1Users > 0 {
        retentionRate = float64(bothDays) / float64(day1Users)
    }

    return &RetentionResult{
        Day1Users:     day1Users,
        Day2Users:     day2Users,
        RetainedUsers: bothDays,
        RetentionRate: retentionRate,
    }, nil
}

// =============================================================================
// Feature Flags
// =============================================================================

type FeatureFlags struct {
    Namespace string
}

func NewFeatureFlags() *FeatureFlags {
    return &FeatureFlags{Namespace: "features"}
}

func (f *FeatureFlags) key(feature string) string {
    return fmt.Sprintf("%s:%s", f.Namespace, feature)
}

func (f *FeatureFlags) EnableForUser(feature string, userID int64) error {
    return client.SetBit(ctx, f.key(feature), userID, 1).Err()
}

func (f *FeatureFlags) DisableForUser(feature string, userID int64) error {
    return client.SetBit(ctx, f.key(feature), userID, 0).Err()
}

func (f *FeatureFlags) IsEnabled(feature string, userID int64) (bool, error) {
    result, err := client.GetBit(ctx, f.key(feature), userID).Result()
    return result == 1, err
}

func (f *FeatureFlags) GetEnabledCount(feature string) (int64, error) {
    return client.BitCount(ctx, f.key(feature), nil).Result()
}

// =============================================================================
// Online Status Tracker
// =============================================================================

type OnlineStatusTracker struct {
    Key string
}

func NewOnlineStatusTracker() *OnlineStatusTracker {
    return &OnlineStatusTracker{Key: "online:users"}
}

func (o *OnlineStatusTracker) SetOnline(userID int64) error {
    return client.SetBit(ctx, o.Key, userID, 1).Err()
}

func (o *OnlineStatusTracker) SetOffline(userID int64) error {
    return client.SetBit(ctx, o.Key, userID, 0).Err()
}

func (o *OnlineStatusTracker) IsOnline(userID int64) (bool, error) {
    result, err := client.GetBit(ctx, o.Key, userID).Result()
    return result == 1, err
}

func (o *OnlineStatusTracker) GetOnlineCount() (int64, error) {
    return client.BitCount(ctx, o.Key, nil).Result()
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    today := time.Now()
    yesterday := today.AddDate(0, 0, -1)

    // Active User Tracking
    tracker := NewActiveUserTracker("active")

    for userID := int64(1); userID <= 10000; userID++ {
        if userID%3 == 0 {
            tracker.TrackActivity(userID, today)
        }
        if userID%2 == 0 {
            tracker.TrackActivity(userID, yesterday)
        }
    }

    dau, _ := tracker.GetDAU(today)
    wau, _ := tracker.GetWAU(today)
    retention, _ := tracker.GetRetention(yesterday, today)

    fmt.Printf("DAU Today: %d\n", dau)
    fmt.Printf("WAU: %d\n", wau)
    fmt.Printf("Retention: %+v\n", retention)

    // Feature Flags
    flags := NewFeatureFlags()
    flags.EnableForUser("new_ui", 123)
    flags.EnableForUser("new_ui", 456)

    enabled, _ := flags.IsEnabled("new_ui", 123)
    count, _ := flags.GetEnabledCount("new_ui")

    fmt.Printf("User 123 has new_ui: %v\n", enabled)
    fmt.Printf("Users with new_ui: %d\n", count)

    // Online Status
    online := NewOnlineStatusTracker()
    online.SetOnline(123)
    online.SetOnline(456)

    isOnline, _ := online.IsOnline(123)
    onlineCount, _ := online.GetOnlineCount()

    fmt.Printf("User 123 online: %v\n", isOnline)
    fmt.Printf("Online users: %d\n", onlineCount)
}
```

## Best Practices

1. **Use sequential user IDs** - Bitmaps work best with sequential integers
2. **Time-based keys** - Create separate bitmaps for time periods
3. **Use BITOP** - Leverage bitwise operations for complex queries
4. **Consider memory** - Each bit uses 1/8 byte; sparse data may be inefficient
5. **Clean up temp keys** - Delete temporary keys created by BITOP

## Conclusion

Redis Bitmaps provide an extremely memory-efficient way to track binary states across large populations. Key takeaways:

- Use bitmaps for binary state tracking (active/inactive, on/off)
- Leverage BITOP for complex set operations
- Perfect for DAU/MAU/WAU tracking
- Ideal for feature flags and permissions
- Memory-efficient for dense populations

Bitmaps' compact storage and efficient bitwise operations make them ideal for real-time analytics and tracking applications.
