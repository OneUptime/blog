# Redis Key Naming Best Practices for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key Naming, Best Practice, Production, Naming Convention

Description: Learn proven Redis key naming conventions that improve readability, prevent collisions, enable efficient scanning, and simplify debugging in production.

---

## Why Key Naming Matters

Redis keys are just strings, but poor naming leads to:

- Key collisions between services or environments
- Difficulty scanning or deleting related keys
- Confusing debug sessions
- Inability to enforce consistent TTLs by group

Good key naming is a cheap investment with high long-term payoff.

## Use Colon-Separated Namespaces

The most widely adopted convention uses colons as namespace separators:

```bash
# Pattern: {service}:{entity}:{id}:{field}

SET user:42:profile '{"name":"Alice"}'
SET user:42:session "abc123"
SET order:789:status "shipped"
SET product:101:inventory 50
SET cache:homepage:rendered "..."
```

This allows you to SCAN keys by pattern and delete related groups:

```bash
# Find all keys for user 42
redis-cli SCAN 0 MATCH "user:42:*" COUNT 100

# Find all session keys
redis-cli SCAN 0 MATCH "user:*:session" COUNT 100
```

## Include Environment in the Key Prefix

For shared Redis instances (not recommended for production, but common):

```bash
# Prefix with environment
SET prod:user:42:profile "..."
SET staging:user:42:profile "..."
SET dev:user:42:profile "..."
```

Or better, use separate Redis instances per environment and omit the environment prefix.

## Keep Keys Short but Descriptive

Redis stores keys in memory. Verbose keys waste memory at scale:

```bash
# Too verbose (42 chars)
SET user_profile_data_for_user_id_42_version_3 "..."

# Too cryptic (hard to understand)
SET u:42:p:3 "..."

# Good balance (15 chars)
SET user:42:profile "..."
```

At 1 million keys, the difference between a 20-char and 50-char key is 30MB of extra memory just for key names.

## Use Lowercase with Hyphens for Multi-Word Segments

```bash
# Good
SET rate-limit:api:user-42 5
SET feature-flag:dark-mode:user-42 "enabled"

# Inconsistent (avoid mixing conventions)
SET rateLimit:API:User42 5
SET rate_limit:api:user_42 5
```

Pick one convention and stick to it across the codebase.

## Avoid Embedding User-Controlled Data Directly

Key injection attacks can occur if user input is used directly in key construction:

```javascript
// Dangerous - user could inject ":" separators or wildcards
const key = `user:${req.params.id}:data`;

// Safer - sanitize or hash unpredictable input
const userId = parseInt(req.params.id);
if (!Number.isInteger(userId)) throw new Error('Invalid userId');
const key = `user:${userId}:data`;
```

## Add Version to Cacheable Data

When your data schema changes, version the cache keys to avoid stale data:

```bash
# Version embedded in key
SET cache:v2:user:42:profile "..."

# When schema changes, bump to v3
SET cache:v3:user:42:profile "..."

# Find all v2 keys, then delete them
redis-cli --scan --pattern "cache:v2:*" | xargs redis-cli DEL
```

## Key Naming for Different Data Types

```bash
# String - simple values
SET session:abc123 '{"userId":42}'

# Hash - structured objects
HSET user:42 name "Alice" email "alice@example.com"

# List - ordered sequences
LPUSH job:queue "task-001"

# Set - unique collections
SADD tag:redis:posts "post:1" "post:2"

# Sorted Set - ranked data
ZADD leaderboard:global 9500 "user:42"

# Stream - event logs
XADD events:user:42 * action "login"
```

## Document Your Key Schema

Maintain a key schema document in your codebase:

```text
Key Pattern                     Type    TTL         Description
-----------                     ----    ---         -----------
user:{id}:profile               Hash    1 hour      User profile data
user:{id}:session               String  24 hours    Active session token
rate-limit:{endpoint}:{ip}      String  60 sec      Request count per IP
job:queue                       List    None        Pending job IDs
leaderboard:{game}              ZSet    None        Player scores
cache:v2:{page}:rendered        String  5 min       Rendered HTML cache
```

## Centralizing Key Builders in Code

```javascript
// keys.js - centralized key builder
const Keys = {
  userProfile: (userId) => `user:${userId}:profile`,
  userSession: (userId) => `user:${userId}:session`,
  rateLimit: (endpoint, ip) => `rate-limit:${endpoint}:${ip}`,
  jobQueue: () => 'job:queue',
  leaderboard: (game) => `leaderboard:${game}`,
  cacheV2: (page) => `cache:v2:${page}:rendered`,
};

module.exports = Keys;
```

```python
class Keys:
    @staticmethod
    def user_profile(user_id): return f"user:{user_id}:profile"

    @staticmethod
    def user_session(user_id): return f"user:{user_id}:session"

    @staticmethod
    def rate_limit(endpoint, ip): return f"rate-limit:{endpoint}:{ip}"

    @staticmethod
    def leaderboard(game): return f"leaderboard:{game}"
```

## Summary

Consistent Redis key naming using colon-separated namespaces, lowercase conventions, and version prefixes prevents collisions and simplifies operations. Keep keys short but descriptive, centralize key construction in code to avoid typos, and document your key schema as part of your codebase. These practices pay dividends during debugging, migrations, and scaling.
