# How to Use BITFIELD in Redis for Complex Bit Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitfield, Bit Operation, Memory Optimization, Command

Description: Learn how to use BITFIELD in Redis to store and manipulate multiple integer fields packed into a single string, enabling memory-efficient compact data storage.

---

## What Is BITFIELD

`BITFIELD` treats a Redis string as an array of arbitrary-width integer fields and allows you to get, set, and increment them atomically. Unlike individual bit commands, `BITFIELD` works with multi-bit integers (8-bit, 16-bit, 32-bit, 64-bit, or arbitrary widths) at any bit offset.

This makes it ideal for storing arrays of small integers compactly without using a hash or list.

## Syntax

```text
BITFIELD key [GET type offset] [SET type offset value] [INCRBY type offset increment] [OVERFLOW WRAP|SAT|FAIL]
```

Integer types:
- `u8`, `u16`, `u32` - unsigned integers (max `u63`)
- `i8`, `i16`, `i32`, `i64` - signed integers
- `u<n>` or `i<n>` - arbitrary widths (e.g., `u3`, `i12`)

Offset types:
- `<number>` - bit offset from start of string
- `#<number>` - element index (offset = index * type_width)

## Basic Usage

### Set a Field

```bash
# Set an unsigned 8-bit integer at bit offset 0 to value 100
redis-cli BITFIELD myfield SET u8 0 100
```

```text
1) (integer) 0
```

Returns the old value (0 for newly created fields).

### Get a Field

```bash
redis-cli BITFIELD myfield GET u8 0
```

```text
1) (integer) 100
```

### Increment a Field

```bash
redis-cli BITFIELD myfield INCRBY u8 0 25
```

```text
1) (integer) 125
```

### Multiple Operations in One Command

```bash
redis-cli BITFIELD myfield SET u8 0 10 SET u8 8 20 SET u8 16 30
redis-cli BITFIELD myfield GET u8 0 GET u8 8 GET u8 16
```

```text
1) (integer) 10
2) (integer) 20
3) (integer) 30
```

## Using Element Index Offset (#)

The `#` prefix multiplies the index by the field width:

```bash
# Set elements at positions 0, 1, 2 of a u8 array
redis-cli BITFIELD myarray SET u8 "#0" 100
redis-cli BITFIELD myarray SET u8 "#1" 200
redis-cli BITFIELD myarray SET u8 "#2" 150

redis-cli BITFIELD myarray GET u8 "#0" GET u8 "#1" GET u8 "#2"
```

```text
1) (integer) 100
2) (integer) 200
3) (integer) 150
```

## Overflow Handling

### WRAP (default) - Wraps around on overflow

```bash
redis-cli BITFIELD counter SET u8 0 255
redis-cli BITFIELD counter OVERFLOW WRAP INCRBY u8 0 1
```

```text
1) (integer) 0
```

Wraps from 255 to 0.

### SAT - Saturates at max/min

```bash
redis-cli BITFIELD counter SET u8 0 250
redis-cli BITFIELD counter OVERFLOW SAT INCRBY u8 0 100
```

```text
1) (integer) 255
```

Stays at the maximum value (255 for u8).

### FAIL - Returns nil on overflow, no change

```bash
redis-cli BITFIELD counter SET u8 0 255
redis-cli BITFIELD counter OVERFLOW FAIL INCRBY u8 0 1
```

```text
1) (nil)
```

## Practical Examples

### User Achievement Flags

Store up to 8 boolean achievement flags in a single byte:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

ACHIEVEMENTS = {
    'first_login': 0,
    'profile_complete': 1,
    'first_purchase': 2,
    'power_user': 3,
    'referral': 4,
}

def grant_achievement(user_id, achievement):
    bit_offset = ACHIEVEMENTS[achievement]
    key = f'achievements:{user_id}'
    r.bitfield(key).set('u1', bit_offset, 1).execute()
    print(f"Granted '{achievement}' to {user_id}")

def has_achievement(user_id, achievement):
    bit_offset = ACHIEVEMENTS[achievement]
    key = f'achievements:{user_id}'
    result = r.bitfield(key).get('u1', bit_offset).execute()
    return bool(result[0])

grant_achievement('user:42', 'first_login')
grant_achievement('user:42', 'first_purchase')
print(has_achievement('user:42', 'first_login'))    # True
print(has_achievement('user:42', 'power_user'))     # False
```

### Game Level and Experience System

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def set_player_stats(player_id, level, xp, health):
    key = f'player:{player_id}:stats'
    # u8 at bit 0 = level (0-255)
    # u16 at bit 8 = XP (0-65535)
    # u8 at bit 24 = health (0-255)
    r.bitfield(key).set('u8', 0, level).set('u16', 8, xp).set('u8', 24, health).execute()

def get_player_stats(player_id):
    key = f'player:{player_id}:stats'
    results = r.bitfield(key).get('u8', 0).get('u16', 8).get('u8', 24).execute()
    return {'level': results[0], 'xp': results[1], 'health': results[2]}

def gain_xp(player_id, amount):
    key = f'player:{player_id}:stats'
    result = r.bitfield(key).overflow('SAT').incrby('u16', 8, amount).execute()
    return result[0]

set_player_stats('player:1', level=5, xp=1200, health=100)
stats = get_player_stats('player:1')
print(f"Stats: {stats}")

new_xp = gain_xp('player:1', 500)
print(f"New XP: {new_xp}")
```

### Compact Rating Storage

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Store ratings (1-5 stars) for up to 200 users in a single key
# Each rating uses 3 bits (enough for values 0-7)

def set_rating(item_id, user_index, rating):
    key = f'ratings:{item_id}'
    r.bitfield(key).set('u3', user_index * 3, rating).execute()

def get_rating(item_id, user_index):
    key = f'ratings:{item_id}'
    result = r.bitfield(key).get('u3', user_index * 3).execute()
    return result[0]

set_rating('product:1', 0, 5)
set_rating('product:1', 1, 3)
set_rating('product:1', 2, 4)

print(get_rating('product:1', 0))  # 5
print(get_rating('product:1', 1))  # 3
```

## Summary

`BITFIELD` enables packing multiple small integers into a single Redis string using arbitrary bit widths, dramatically reducing memory usage compared to hashes or lists for dense integer arrays. It supports atomic GET, SET, and INCRBY operations with three overflow policies: WRAP (circular), SAT (clamp to bounds), and FAIL (reject on overflow). Common use cases include achievement flags, game stats, compact rating storage, and fixed-width integer arrays.
