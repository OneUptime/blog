# How to Use CF.EXISTS in Redis to Check Cuckoo Filter Membership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cuckoo Filter, RedisBloom, Command, NoSQL

Description: Learn how to use CF.EXISTS in Redis to test whether an item is present in a Cuckoo filter, and understand its false positive behavior.

---

## Overview

`CF.EXISTS` checks whether a given item is a member of a Cuckoo filter in Redis. Like Bloom filters, Cuckoo filters can return false positives - a `1` means the item was "probably" inserted, while a `0` is a definitive negative. However, Cuckoo filters also support deletion, which can affect membership checks if items are deleted after insertion.

## Prerequisites

Redis Stack or RedisBloom module:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Setting Up a Cuckoo Filter

```bash
CF.RESERVE inventory 100000
CF.ADD inventory "item-101"
CF.ADD inventory "item-202"
CF.ADD inventory "item-303"
```

## Using CF.EXISTS

```bash
CF.EXISTS inventory "item-101"
# Returns 1 - probably exists

CF.EXISTS inventory "item-999"
# Returns 0 - definitely does not exist
```

Return values:
- `1` - item was probably inserted (may be a false positive)
- `0` - item was definitely never inserted

## Deletion Impact on CF.EXISTS

Unlike Bloom filters, items can be removed from Cuckoo filters. After deletion, `CF.EXISTS` correctly returns `0`. However, never delete an item that was not previously added - doing so may corrupt the filter and cause false negatives:

```bash
CF.ADD inventory "item-101"
CF.EXISTS inventory "item-101"
# Returns 1

CF.DEL inventory "item-101"
CF.EXISTS inventory "item-101"
# Returns 0 - now correctly absent
```

## CF.EXISTS vs BF.EXISTS Comparison

| Feature | CF.EXISTS | BF.EXISTS |
|---------|-----------|-----------|
| False positives | Yes | Yes |
| False negatives | Possible after deleting non-added items | No |
| Supports deletion | Yes | No |
| Space efficiency | Better at typical FP rates (<3%) | Slightly worse |

## Using CF.EXISTS in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('CF.RESERVE', 'banned_users', 500000)
r.execute_command('CF.ADD', 'banned_users', 'user-evil')
r.execute_command('CF.ADD', 'banned_users', 'user-spammer')

def is_banned(user_id):
    result = r.execute_command('CF.EXISTS', 'banned_users', user_id)
    return bool(result)

print(is_banned('user-evil'))     # True
print(is_banned('user-good'))     # False (probably)
print(is_banned('user-spammer'))  # True
```

## Using CF.EXISTS in Node.js

```javascript
const { createClient } = require('redis');

async function checkMembership(filterName, item) {
  const client = createClient();
  await client.connect();

  const exists = await client.sendCommand(['CF.EXISTS', filterName, item]);
  console.log(`"${item}" in "${filterName}": ${exists === 1 ? 'probably yes' : 'definitely no'}`);

  await client.disconnect();
  return exists === 1;
}

checkMembership('inventory', 'item-101');
checkMembership('inventory', 'item-999');
```

## Practical Use Case - Access Control

Use `CF.EXISTS` as a fast pre-check before querying the authoritative ACL store:

```python
def check_access(user_id, resource_id):
    # Quick bloom-like check
    key = f"acl:{resource_id}"
    maybe_has_access = r.execute_command('CF.EXISTS', key, user_id)

    if not maybe_has_access:
        return False  # Definitely no access - skip DB query

    # May have access - verify with database
    return db.check_permission(user_id, resource_id)

def grant_access(user_id, resource_id):
    key = f"acl:{resource_id}"
    r.execute_command('CF.ADD', key, user_id)
    db.insert_permission(user_id, resource_id)

def revoke_access(user_id, resource_id):
    key = f"acl:{resource_id}"
    r.execute_command('CF.DEL', key, user_id)  # Deletion supported!
    db.remove_permission(user_id, resource_id)
```

## Handling False Positives

For security-sensitive use cases, treat `CF.EXISTS` returning `1` as a "maybe" and always confirm with a source of truth:

```python
def secure_check(user_id):
    quick_check = r.execute_command('CF.EXISTS', 'blocked_users', user_id)
    if quick_check:
        # Confirm with database - may be a false positive
        return db.is_user_blocked(user_id)
    return False  # Definitely not blocked
```

## Summary

`CF.EXISTS` tests Cuckoo filter membership with probabilistic accuracy - it returns `1` for probable members and `0` for definite non-members. The key advantage over `BF.EXISTS` is that Cuckoo filters support deletion, so a `0` after `CF.DEL` is reliable. Always confirm positive results with an authoritative source in security-critical applications.
