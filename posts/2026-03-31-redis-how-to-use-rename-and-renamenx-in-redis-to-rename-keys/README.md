# How to Use RENAME and RENAMENX in Redis to Rename Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key Management, Command, Data Operations

Description: Learn how to use RENAME and RENAMENX in Redis to rename keys, understand how they handle existing destination keys, and avoid common pitfalls with TTL behavior.

---

## What Are RENAME and RENAMENX

`RENAME` renames a key to a new name. If the destination key already exists, it is overwritten. `RENAMENX` only renames if the destination key does not exist (NX = Not eXists). Both commands are atomic.

```text
RENAME source destination
RENAMENX source destination
```

`RENAME` returns `OK`. `RENAMENX` returns `1` (renamed) or `0` (destination exists, not renamed).

## Basic RENAME Usage

```bash
SET user:temp "Alice"
RENAME user:temp user:1

GET user:1
# "Alice"

GET user:temp
# (nil) - old key is gone
```

## RENAME Overwrites Existing Keys

If the destination key exists, `RENAME` deletes it first:

```bash
SET key1 "original"
SET key2 "will be overwritten"

RENAME key1 key2

GET key1
# (nil)
GET key2
# "original"   <- key2 was overwritten
```

## RENAMENX - Only If Destination Is Free

```bash
SET key1 "value1"
SET key2 "value2"

# Will not rename because key2 exists
RENAMENX key1 key2
# (integer) 0

GET key1
# "value1"  - unchanged

# Will rename because key3 does not exist
RENAMENX key1 key3
# (integer) 1

GET key3
# "value1"
```

## TTL Behavior During RENAME

The TTL of the source key is preserved when renamed:

```bash
SET mykey "hello"
EXPIRE mykey 3600

TTL mykey
# (integer) 3600

RENAME mykey newkey

TTL newkey
# (integer) ~3600  <- TTL is preserved
```

However, if you rename over a key with a TTL, the destination key's TTL is replaced by the source's TTL (or lack thereof):

```bash
SET permanent "no expiry"
SET expiring "has expiry"
EXPIRE expiring 60

RENAME permanent expiring

TTL expiring
# (integer) -1  <- permanent key had no TTL, now destination is permanent
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Stage data under temp key, then make it live atomically
client.hset('job:processing:12345', 'status', 'processing')

# Do some processing...
client.hset('job:processing:12345', 'status', 'done')
client.hset('job:processing:12345', 'result', 'success')

# Atomically publish the result
client.rename('job:processing:12345', 'job:result:12345')
print(f"Job result: {client.hgetall('job:result:12345')}")
```

## Practical Example with RENAMENX

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_rename(old_key, new_key):
    """Rename only if new key doesn't exist."""
    result = client.renamenx(old_key, new_key)
    if result:
        print(f"Renamed '{old_key}' to '{new_key}'")
    else:
        print(f"Rename failed: '{new_key}' already exists")
    return bool(result)

client.set('draft:post:42', 'Post content here...')
client.set('published:post:42', 'Already published!')

# This will fail - published key exists
safe_rename('draft:post:42', 'published:post:42')

# This will succeed
safe_rename('draft:post:42', 'published:post:99')
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Build data under a draft key
await client.hSet('product:draft:101', {
  name: 'Widget Pro',
  price: '29.99',
  stock: '500'
});

// Atomically publish
await client.rename('product:draft:101', 'product:active:101');
console.log('Product published');

const product = await client.hGetAll('product:active:101');
console.log('Active product:', product);

// Use RENAMENX to avoid overwriting
const success = await client.renameNX('product:draft:102', 'product:active:102');
console.log(`RenameNX result: ${success}`); // true if renamed, false if skipped
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    rdb.Set(ctx, "temp:config", "value", 0)

    // Rename
    err := rdb.Rename(ctx, "temp:config", "active:config").Err()
    if err != nil {
        panic(err)
    }
    fmt.Println("Renamed successfully")

    // RenameNX
    rdb.Set(ctx, "candidate:key", "data", 0)
    result, err := rdb.RenameNX(ctx, "candidate:key", "active:config").Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("RenameNX: %v\n", result) // false - active:config exists
}
```

## RENAME on Non-Existent Source

```bash
RENAME nonexistent:key newname
# ERR no such key
```

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

try:
    client.rename('nonexistent', 'target')
except redis.ResponseError as e:
    print(f"Error: {e}")  # ERR no such key
```

## Use Cases

- **Draft to live**: build data under a draft key, publish atomically with RENAME
- **Atomic swap**: swap two key names using a temp key
- **Key migration**: migrate keys to new naming conventions without data loss
- **Conditional rename**: use RENAMENX when you want to protect existing data

## Atomic Key Swap Pattern

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def atomic_swap(key1, key2):
    """Swap values of two keys atomically using a temp key."""
    temp = f"__swap_temp_{key1}_{key2}"

    with client.pipeline() as pipe:
        pipe.rename(key1, temp)
        pipe.rename(key2, key1)
        pipe.rename(temp, key2)
        pipe.execute()
    print(f"Swapped {key1} and {key2}")

client.set('active', 'v1 data')
client.set('standby', 'v2 data')

atomic_swap('active', 'standby')
print(client.get('active'))   # v2 data
print(client.get('standby'))  # v1 data
```

## Summary

`RENAME` atomically renames a key, overwriting the destination if it exists and preserving the source key's TTL. `RENAMENX` only renames if the destination key is absent, making it safe for conditional publish patterns. Both commands return an error if the source key does not exist. Use `RENAMENX` when protecting existing data and `RENAME` for atomic swap or publish operations.
