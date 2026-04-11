# How to Use DUMP and RESTORE in Redis to Serialize Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Serialization, Key Management, Backup, Command

Description: Learn how to use DUMP and RESTORE in Redis to serialize key values to a binary format and restore them, enabling cross-server data migration and key-level backups.

---

## What Are DUMP and RESTORE

`DUMP` serializes a key's value to a Redis-specific binary format (RDB serialization). `RESTORE` deserializes this binary data and creates a new key with the original value. Together they enable key-level migration between Redis instances or databases.

```text
DUMP key
RESTORE key ttl serialized-value [REPLACE] [ABSTTL] [IDLETIME seconds] [FREQ frequency]
```

`DUMP` returns the serialized binary string. `RESTORE` returns `OK` on success.

## Basic DUMP Usage

```bash
SET source:key "hello world"
DUMP source:key
# "\x00\x0bhello world\n\x00\x0f..."  <- binary data
```

## DUMP + RESTORE in Same Instance

```bash
# Get the serialized value
SET mykey "important data"
DUMP mykey
# "\x00\rimportant data\n\x00\xcf..."

# Restore to a new key with 0 TTL (no expiry)
RESTORE mykey:copy 0 "\x00\rimportant data\n\x00\xcf..."

GET mykey:copy
# "important data"
```

## RESTORE Options

```text
RESTORE key ttl value [REPLACE] [ABSTTL] [IDLETIME] [FREQ]
```

- `ttl` - TTL in milliseconds (0 = no expiry)
- `REPLACE` - overwrite if destination key exists
- `ABSTTL` - treat TTL as absolute Unix timestamp in milliseconds
- `IDLETIME` - set the key's idle time (LRU clock)
- `FREQ` - set the key's LFU frequency counter

## Practical Example - Cross-Database Migration in Python

```python
import redis

# Source and destination connections
source = redis.Redis(host='localhost', port=6379, db=0, decode_responses=False)
dest = redis.Redis(host='localhost', port=6379, db=3, decode_responses=False)

def migrate_key(key, source_client, dest_client, replace=False):
    """Migrate a key from source to destination Redis."""
    # Serialize the key
    serialized = source_client.dump(key)
    if serialized is None:
        print(f"Key '{key}' does not exist in source")
        return False

    # Get the remaining TTL in milliseconds
    pttl = source_client.pttl(key)
    if pttl < 0:
        pttl = 0  # No expiry

    # Restore in destination
    try:
        dest_client.restore(key, pttl, serialized, replace=replace)
        print(f"Migrated '{key}' (TTL: {pttl}ms)")
        return True
    except redis.ResponseError as e:
        if 'BUSYKEY' in str(e):
            print(f"Key '{key}' already exists in destination (use replace=True)")
        else:
            print(f"Error: {e}")
        return False

# Test migration
source.set('mydata', 'important value')
source.lpush('mylist', 'item1', 'item2', 'item3')
source.hset('myhash', mapping={'name': 'Alice', 'age': '30'})

for key in ['mydata', 'mylist', 'myhash']:
    migrate_key(key, source, dest)
```

## Batch Key Migration

```python
import redis

source = redis.Redis(host='source-host', port=6379, decode_responses=False)
dest = redis.Redis(host='dest-host', port=6379, decode_responses=False)

def batch_migrate(pattern='*', batch_size=100):
    """Migrate all matching keys from source to destination."""
    migrated = 0
    failed = 0
    cursor = 0

    while True:
        cursor, keys = source.scan(cursor, match=pattern, count=batch_size)

        # Use pipeline for efficiency
        pipe = source.pipeline(transaction=False)
        for key in keys:
            pipe.dump(key)
            pipe.pttl(key)
        results = pipe.execute()

        # Process results in pairs (dump, pttl)
        dest_pipe = dest.pipeline(transaction=False)
        valid_keys = []
        for i, key in enumerate(keys):
            serialized = results[i * 2]
            pttl = results[i * 2 + 1]

            if serialized is None:
                continue

            if pttl < 0:
                pttl = 0

            dest_pipe.restore(key, pttl, serialized, replace=True)
            valid_keys.append(key)

        try:
            dest_pipe.execute()
            migrated += len(valid_keys)
        except Exception as e:
            print(f"Batch error: {e}")
            failed += len(valid_keys)

        if cursor == 0:
            break

    print(f"Migration complete: {migrated} migrated, {failed} failed")

batch_migrate(pattern='user:*')
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
  const source = createClient({ socket: { host: 'localhost', port: 6379 } });
  const dest = createClient({ socket: { host: 'localhost', port: 6380 } });

  await source.connect();
  await dest.connect();

  async function migrateKey(key) {
    // Serialize from source
    const serialized = await source.dump(key);
    if (!serialized) {
      console.log(`Key '${key}' not found`);
      return false;
    }

    // Get TTL
    const pttl = await source.pTTL(key);
    const ttl = pttl < 0 ? 0 : pttl;

    // Restore to destination
    await dest.restore(key, ttl, serialized, { REPLACE: true });
    console.log(`Migrated '${key}' with TTL ${ttl}ms`);
    return true;
  }

  await source.set('config', 'value1');
  await source.lPush('queue', ['task1', 'task2']);

  await migrateKey('config');
  await migrateKey('queue');
})();
```

## Key-Level Backup

```python
import redis
import json
import base64
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=False)

def backup_keys(pattern='*', output_file='redis_backup.json'):
    """Create a JSON backup of matching keys."""
    backup = {}
    cursor = 0

    while True:
        cursor, keys = client.scan(cursor, match=pattern, count=100)
        for key in keys:
            serialized = client.dump(key)
            if serialized:
                pttl = client.pttl(key)
                key_str = key.decode('utf-8')
                backup[key_str] = {
                    'data': base64.b64encode(serialized).decode('ascii'),
                    'pttl': pttl if pttl > 0 else 0,
                    'backed_up_at': int(time.time()),
                }
        if cursor == 0:
            break

    with open(output_file, 'w') as f:
        json.dump(backup, f, indent=2)

    print(f"Backed up {len(backup)} keys to {output_file}")

def restore_backup(input_file='redis_backup.json'):
    """Restore keys from a JSON backup."""
    with open(input_file, 'r') as f:
        backup = json.load(f)

    restored = 0
    for key, entry in backup.items():
        serialized = base64.b64decode(entry['data'])
        pttl = entry['pttl']
        client.restore(key.encode(), pttl, serialized, replace=True)
        restored += 1

    print(f"Restored {restored} keys")

backup_keys(pattern='user:*')
```

## Using MIGRATE for Cross-Server Transfer

For simpler cross-server migration, use the built-in `MIGRATE` command which combines DUMP+RESTORE+DEL atomically:

```bash
# Move key from current server to another
MIGRATE 192.168.1.100 6379 mykey 0 5000

# Move multiple keys
MIGRATE 192.168.1.100 6379 "" 0 5000 KEYS key1 key2 key3
```

## Summary

`DUMP` serializes a Redis key's value to a binary RDB format, and `RESTORE` recreates the key from that binary data. Use them together for key-level backups, cross-database migration, and cross-server data transfer. For cross-server migration of individual keys, consider the built-in `MIGRATE` command which handles the DUMP-RESTORE cycle atomically. Always preserve the TTL by reading it before dumping and passing it to RESTORE.
