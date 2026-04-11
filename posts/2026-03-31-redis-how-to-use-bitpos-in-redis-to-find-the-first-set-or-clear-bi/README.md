# How to Use BITPOS in Redis to Find the First Set or Clear Bit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitmap, BITPOS, Bit Operation, Command

Description: Learn how to use BITPOS in Redis to find the position of the first set (1) or clear (0) bit in a string, enabling efficient ID allocation and status scanning.

---

## What Is BITPOS

`BITPOS` returns the position of the first bit set to 0 or 1 in a Redis string. You can optionally restrict the search to a specific byte range. It is useful for finding the first available slot in a bitmap, scanning for status changes, and free resource allocation.

## Syntax

```text
BITPOS key bit [start [end [BYTE|BIT]]]
```

- `key` - the Redis string key
- `bit` - `0` or `1` - whether to search for a clear or set bit
- `start` - start of search range (default: 0)
- `end` - end of search range (default: -1 for last byte)
- `BYTE|BIT` - whether `start`/`end` are byte offsets or bit offsets (Redis 7.0+)

Returns the position (0-based bit index) of the first matching bit, or `-1` if not found.

## Basic Usage

### Find First Set Bit

```bash
redis-cli SET mykey "\xff\xf0\x00"

redis-cli BITPOS mykey 1
```

```text
(integer) 0
```

The first byte is `0xff` (all 1s), so the first set bit is at position 0.

### Find First Clear Bit

```bash
redis-cli BITPOS mykey 0
```

```text
(integer) 12
```

`\xff` (8 bits set), `\xf0` (first 4 bits set), so the first 0 is at bit 12.

### Find First Set Bit in User Activity Bitmap

```bash
redis-cli SETBIT active:users 5 1
redis-cli SETBIT active:users 10 1
redis-cli SETBIT active:users 100 1

redis-cli BITPOS active:users 1
```

```text
(integer) 5
```

User 5 is the first active user.

### Find First Available Slot (Clear Bit)

```bash
redis-cli SETBIT slots 0 1
redis-cli SETBIT slots 1 1
redis-cli SETBIT slots 2 1
redis-cli SETBIT slots 3 0

redis-cli BITPOS slots 0
```

```text
(integer) 3
```

Slot 3 is the first free position.

## Range-Based Search

### Byte Range

```bash
# Search only in bytes 1-2 (bits 8-23)
redis-cli BITPOS mykey 0 1 2
```

### Bit Range (Redis 7.0+)

```bash
# Search only in bits 8 through 23
redis-cli BITPOS mykey 0 8 23 BIT
```

## Practical Examples

### Free User ID Allocator

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def allocate_user_id():
    """Find and claim the first available user ID."""
    # Find first bit that is 0 (free slot)
    free_id = r.bitpos('allocated_ids', 0)
    if free_id == -1:
        raise Exception("No free IDs available")

    # Mark as allocated
    r.setbit('allocated_ids', free_id, 1)
    return free_id

def release_user_id(user_id):
    """Free a user ID for reuse."""
    r.setbit('allocated_ids', user_id, 0)

# Allocate some IDs
id1 = allocate_user_id()
id2 = allocate_user_id()
id3 = allocate_user_id()
print(f"Allocated: {id1}, {id2}, {id3}")  # 0, 1, 2

# Release ID 1
release_user_id(id2)

# Allocate again - should reuse ID 1
id4 = allocate_user_id()
print(f"Reused ID: {id4}")  # 1
```

### First Day a User Was Active

```python
import redis
import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

base_date = datetime.date(2026, 1, 1)

def mark_active(user_id, date):
    day_num = (date - base_date).days
    r.setbit(f'user:{user_id}:activity', day_num, 1)

def first_active_day(user_id):
    day_num = r.bitpos(f'user:{user_id}:activity', 1)
    if day_num == -1:
        return None
    return base_date + datetime.timedelta(days=day_num)

def last_active_day(user_id):
    # BITPOS finds first set bit; for last, we use BITPOS from the end
    # Search backwards using byte range is complex; use STRLEN + iteration
    total_bytes = r.strlen(f'user:{user_id}:activity')
    if total_bytes == 0:
        return None
    # Search last byte backward
    for byte_idx in range(total_bytes - 1, -1, -1):
        pos = r.bitpos(f'user:{user_id}:activity', 1, byte_idx, byte_idx)
        if pos != -1:
            return base_date + datetime.timedelta(days=pos)
    return None

mark_active(42, datetime.date(2026, 2, 15))
mark_active(42, datetime.date(2026, 3, 1))
mark_active(42, datetime.date(2026, 3, 20))

print(f"First active: {first_active_day(42)}")  # 2026-02-15
```

### Check If Any User in a Range Is Active

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Mark some users as online
for uid in [15, 16, 20, 25, 30]:
    r.setbit('online:users', uid, 1)

def any_online_in_range(start_user, end_user):
    """Check if any user in [start, end] is online."""
    # Use BIT mode to specify bit range directly (Redis 7.0+)
    pos = r.bitpos('online:users', 1, start_user, end_user, 'bit' if True else None)
    return pos != -1 and start_user <= pos <= end_user

print(any_online_in_range(10, 18))  # True (user 15, 16)
print(any_online_in_range(21, 24))  # False
```

## Summary

`BITPOS` efficiently finds the first set or clear bit within a Redis bitmap string, with optional byte or bit range constraints. It is the key building block for free-slot allocation systems where available IDs are tracked as 0-bits, for finding the first active record in a timeline bitmap, and for scanning any dense boolean array for state changes. The result is a 0-based bit index or -1 when no matching bit is found.
