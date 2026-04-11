# How to Use BITFIELD_RO in Redis for Read-Only Bit Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitfield, BITFIELD_RO, Read-Only, Replica

Description: Learn how to use BITFIELD_RO in Redis to safely read bitfield values in read-only contexts such as replicas and read-only scripts.

---

## What Is BITFIELD_RO

`BITFIELD_RO` is the read-only variant of `BITFIELD`. It supports only the `GET` subcommand, making it safe to run on Redis replicas and within Lua scripts that are intended to be read-only. This prevents accidental writes when querying bitfield data in distributed or scripted contexts.

It was introduced in Redis 6.0.

## Syntax

```text
BITFIELD_RO key [GET type offset [GET type offset ...]]
```

- `key` - the Redis string/bitfield key
- `GET type offset` - read an integer field at the given bit offset

Integer types follow the same format as `BITFIELD`:
- `u8`, `u16`, `u32` - unsigned (up to `u63` max)
- `i8`, `i16`, `i32`, `i64` - signed
- `u<n>` or `i<n>` - arbitrary widths

Offset with `#` prefix uses element index notation: `#n` = `n * field_width`.

## Basic Usage

### Read a Single Field

```bash
# First, write data with BITFIELD
redis-cli BITFIELD player:1 SET u8 "#0" 15 SET u16 8 2500 SET u8 24 95

# Read with BITFIELD_RO
redis-cli BITFIELD_RO player:1 GET u8 "#0"
```

```text
1) (integer) 15
```

### Read Multiple Fields

```bash
redis-cli BITFIELD_RO player:1 GET u8 "#0" GET u16 8 GET u8 24
```

```text
1) (integer) 15
2) (integer) 2500
3) (integer) 95
```

### Element Index Syntax

```bash
# Write array of u8 values
redis-cli BITFIELD ratings SET u8 "#0" 5 SET u8 "#1" 3 SET u8 "#2" 4

# Read using element index
redis-cli BITFIELD_RO ratings GET u8 "#0" GET u8 "#1" GET u8 "#2"
```

```text
1) (integer) 5
2) (integer) 3
3) (integer) 4
```

## BITFIELD_RO vs BITFIELD GET

Both commands return the same data, but `BITFIELD_RO` signals to Redis that no writes will occur:

```bash
# Both are equivalent for reading, but BITFIELD_RO is replica-safe
redis-cli BITFIELD key GET u8 0
redis-cli BITFIELD_RO key GET u8 0
```

Use `BITFIELD_RO` when:
- Executing on a read replica
- Running inside a read-only Lua script (`redis.call` in a `EVAL` on replicas)
- Enforcing read-only access semantics explicitly

## Practical Examples

### Reading Player Stats from Replica

```python
import redis

# Connect to replica for read traffic
replica = redis.Redis(host='redis-replica', port=6379, decode_responses=True)
primary = redis.Redis(host='redis-primary', port=6379, decode_responses=True)

def set_player_stats(player_id, level, xp, health):
    key = f'player:{player_id}:stats'
    bf = primary.bitfield(key)
    bf.set('u8', '#0', level)
    bf.set('u16', 8, xp)
    bf.set('u8', 24, health)
    bf.execute()

def get_player_stats_readonly(player_id):
    key = f'player:{player_id}:stats'
    # Use BITFIELD_RO on replica - safe for read-only Redis instances
    results = replica.bitfield_ro(key, 'u8', '#0',
        items=[('u16', 8), ('u8', 24)]
    )
    return {
        'level': results[0],
        'xp': results[1],
        'health': results[2]
    }
```

### Read-Only Analytics Dashboard

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Simulate data written by another service
bf = r.bitfield('metrics:daily')
bf.set('u16', '#0', 1420)  # page views
bf.set('u16', '#1', 382)   # signups
bf.set('u16', '#2', 91)    # purchases
bf.execute()

def get_daily_metrics():
    results = r.bitfield_ro('metrics:daily', 'u16', '#0',
        items=[('u16', '#1'), ('u16', '#2')]
    )
    return {
        'page_views': results[0],
        'signups': results[1],
        'purchases': results[2]
    }

metrics = get_daily_metrics()
print(f"Today's metrics: {metrics}")
# {'page_views': 1420, 'signups': 382, 'purchases': 91}
```

### Compact Feature Flags Reader

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Flags written by config service using BITFIELD
bf = r.bitfield('features:v2')
bf.set('u1', 0, 1)   # dark_mode on
bf.set('u1', 1, 0)   # new_checkout off
bf.set('u1', 2, 1)   # beta_search on
bf.set('u1', 3, 0)   # ai_assistant off
bf.execute()

FEATURES = ['dark_mode', 'new_checkout', 'beta_search', 'ai_assistant']

def get_all_feature_flags():
    items = [('u1', i) for i in range(1, len(FEATURES))]
    results = r.bitfield_ro('features:v2', 'u1', 0, items=items)
    return {name: bool(val) for name, val in zip(FEATURES, results)}

flags = get_all_feature_flags()
print(flags)
# {'dark_mode': True, 'new_checkout': False, 'beta_search': True, 'ai_assistant': False}
```

### Read Achievement Flags

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

ACHIEVEMENTS = ['first_login', 'profile_complete', 'first_purchase', 'power_user', 'referral']

def get_user_achievements(user_id):
    key = f'achievements:{user_id}'
    items = [('u1', i) for i in range(1, len(ACHIEVEMENTS))]
    results = r.bitfield_ro(key, 'u1', 0, items=items)
    return {name: bool(val) for name, val in zip(ACHIEVEMENTS, results)}

# Simulate writing achievements
bf = r.bitfield('achievements:user:42')
bf.set('u1', 0, 1)
bf.set('u1', 2, 1)
bf.execute()

achievements = get_user_achievements('user:42')
print(f"Achievements: {achievements}")
# {'first_login': True, 'profile_complete': False, 'first_purchase': True, ...}
```

## Summary

`BITFIELD_RO` is the read-only counterpart to `BITFIELD`, supporting only `GET` subcommands to ensure safety on read replicas and in read-only scripting contexts. Use it whenever bitfield data needs to be queried in a replica-safe or write-free context. The data format and offset syntax are identical to `BITFIELD`, making it a drop-in replacement for read operations in distributed Redis architectures.
