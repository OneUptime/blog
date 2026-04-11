# How to Use BITOP in Redis for Bitwise Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitmap, Command, Data Structure

Description: Learn how to use Redis BITOP to perform AND, OR, XOR, and NOT operations on multiple bitmap keys for analytics and feature flag management.

---

## What Is BITOP?

`BITOP` performs bitwise operations between multiple string keys (used as bitmaps) and stores the result in a destination key.

```text
Syntax: BITOP operation destkey key [key ...]
Operations: AND, OR, XOR, NOT
```

- `AND`: bits are 1 only where ALL keys have 1
- `OR`: bits are 1 where ANY key has 1
- `XOR`: bits are 1 where an odd number of keys have 1 (for two keys, where exactly one has 1)
- `NOT`: inverts all bits in a single key

## Basic Examples

```bash
# Set up bitmap keys
SETBIT key1 0 1   # bit 0 = 1
SETBIT key1 1 1   # bit 1 = 1
SETBIT key1 2 0   # bit 2 = 0

SETBIT key2 0 1   # bit 0 = 1
SETBIT key2 1 0   # bit 1 = 0
SETBIT key2 2 1   # bit 2 = 1

# AND: only bits set in BOTH keys
BITOP AND result_and key1 key2
BITCOUNT result_and
# Result: 1 (only bit 0 is 1 in both)

# OR: bits set in EITHER key
BITOP OR result_or key1 key2
BITCOUNT result_or
# Result: 3 (bits 0, 1, 2 are set in at least one key)

# XOR: bits set in ONE but not BOTH keys
BITOP XOR result_xor key1 key2
BITCOUNT result_xor
# Result: 2 (bits 1 and 2 differ between keys)

# NOT: invert all bits (operates on single key only)
BITOP NOT result_not key1
```

## Practical Use Case 1 - Daily Active User Analytics

Track which users were active on multiple days and find intersections:

```bash
# Record user activity (user IDs as bit offsets)
SETBIT active:2024-01-13 1001 1
SETBIT active:2024-01-13 1002 1
SETBIT active:2024-01-13 1003 1

SETBIT active:2024-01-14 1001 1
SETBIT active:2024-01-14 1004 1

SETBIT active:2024-01-15 1001 1
SETBIT active:2024-01-15 1002 1
SETBIT active:2024-01-15 1004 1

# Users active on ALL 3 days (AND)
BITOP AND active_all_days active:2024-01-13 active:2024-01-14 active:2024-01-15
BITCOUNT active_all_days
# Returns: 1 (only user 1001 was active all 3 days)

# Users active on ANY day (OR)
BITOP OR active_any_day active:2024-01-13 active:2024-01-14 active:2024-01-15
BITCOUNT active_any_day
# Returns: 4 (users 1001, 1002, 1003, 1004)
```

## Practical Use Case 2 - Feature Flag Rollout Analysis

```bash
# Users who received feature A
SETBIT feature:A 100 1
SETBIT feature:A 101 1
SETBIT feature:A 102 1

# Users who received feature B
SETBIT feature:B 101 1
SETBIT feature:B 102 1
SETBIT feature:B 103 1

# Users who received BOTH features
BITOP AND feature:A_and_B feature:A feature:B
BITCOUNT feature:A_and_B
# Returns: 2 (users 101, 102)

# Users who received A but NOT B
BITOP NOT feature:not_B feature:B
BITOP AND feature:A_only feature:A feature:not_B
BITCOUNT feature:A_only
# Returns: 1 (user 100)
```

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=False)

def find_returning_users(days: list) -> int:
    """Find users who were active on ALL specified days."""
    keys = [f'active:{day}' for day in days]
    dest_key = 'temp:returning_users'
    
    r.bitop('AND', dest_key, *keys)
    count = r.bitcount(dest_key)
    r.expire(dest_key, 3600)  # Expire after 1 hour
    return count

def find_churn_candidates(active_days: list, inactive_days: list) -> int:
    """Users active in the past but NOT recently (potential churn)."""
    # Users active before
    r.bitop('OR', 'temp:was_active', *[f'active:{d}' for d in active_days])
    
    # Users active recently (to exclude)
    r.bitop('OR', 'temp:recently_active', *[f'active:{d}' for d in inactive_days])
    
    # Users who were active but are NOT recently active
    r.bitop('NOT', 'temp:not_recent', 'temp:recently_active')
    r.bitop('AND', 'temp:churned', 'temp:was_active', 'temp:not_recent')
    
    return r.bitcount('temp:churned')

# Usage
returning = find_returning_users(['2024-01-13', '2024-01-14', '2024-01-15'])
print(f"Users active all 3 days: {returning}")
```

## Node.js Example

```javascript
const redis = require('redis');
const client = redis.createClient();

async function weeklyActiveUsers(startDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(`active:${d.toISOString().split('T')[0]}`);
  }
  
  // Users active on at least one day this week
  await client.bitOp('OR', 'weekly:active', ...days);
  const count = await client.bitCount('weekly:active');
  await client.expire('weekly:active', 86400);
  return count;
}
```

## Performance Notes

```bash
# BITOP processes strings byte by byte
# O(N) where N is the length of the longest input key

# For user IDs in the millions, the bitmap key length grows accordingly
# 1,000,000 users = ~125 KB per bitmap key

# Use EXPIRE on result keys to avoid unbounded memory growth
BITOP AND result key1 key2
EXPIRE result 3600
```

## NOT Operation Caveat

```bash
# NOT can produce unexpected results with unequal-length keys
# NOT pads shorter keys with 0 bits, but NOT inverts padding to 1s
# Always use same-length bitmaps for predictable NOT results

# Safe NOT: create a universe bitmap and AND with NOT result
BITOP NOT temp:not_key key1
BITOP AND result universe temp:not_key
```

## Summary

Redis BITOP performs AND, OR, XOR, and NOT operations on bitmap keys, storing results in a destination key. It is particularly powerful for cohort analysis, tracking user intersections across multiple dimensions (days, features, segments), and feature flag analytics. For large user populations, bitmaps are extremely memory-efficient compared to sets. Always set an expiry on temporary result keys and be cautious with NOT on keys of different lengths.
