# How to Use DUMP and RESTORE in Redis for Key Serialization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Dump, Restore, Serialization, Migration

Description: Learn how to use DUMP and RESTORE in Redis to serialize and deserialize key values, enabling key-level backup, cross-server migration, and data transfer.

---

## How DUMP and RESTORE Work

DUMP serializes the value of a key into a Redis-internal binary format and returns the serialized data. RESTORE takes that binary payload and deserializes it into a new key, optionally with a TTL. Together they form a low-level key-by-key serialization and migration mechanism.

DUMP includes an 8-byte CRC64 checksum in the payload to detect corruption. The serialization format is version-specific and compatible with RESTORE on the same or a newer Redis version.

```mermaid
flowchart LR
    A[Source Redis] --> B[DUMP key]
    B --> C[Binary serialized payload]
    C --> D[Transfer payload to destination]
    D --> E[RESTORE newkey TTL payload]
    E --> F[Destination Redis - key restored]
```

## Syntax

```redis
DUMP key

RESTORE key ttl serialized-value [REPLACE] [ABSTTL] [IDLETIME seconds] [FREQ frequency]
```

- `key` - target key name for RESTORE
- `ttl` - TTL in milliseconds; use 0 for no expiry
- `serialized-value` - the binary payload from DUMP
- `REPLACE` - overwrite destination if it exists (Redis 3.0+)
- `ABSTTL` - treat `ttl` as an absolute Unix timestamp in milliseconds (Redis 5.0+)
- `IDLETIME` - set the idle time for LRU eviction (Redis 5.0+)
- `FREQ` - set the LFU frequency counter (Redis 5.0+)

## Examples

### DUMP a key to get its serialized value

```redis
SET greeting "hello, world"
DUMP greeting
```

```text
"\x00\x0chello, world\n\x00\xef\xf5K\xac\xfd#\xa6\x97"
```

The output is a binary string. In the Redis CLI it appears escaped.

### RESTORE a key from a serialized value

```redis
RESTORE greeting:copy 0 "\x00\x0chello, world\n\x00\xef\xf5K\xac\xfd#\xa6\x97"
```

```text
OK
```

```redis
GET greeting:copy
```

```text
"hello, world"
```

### RESTORE with a TTL (in milliseconds)

```redis
RESTORE temp:copy 60000 "\x00\x0chello, world\n\x00\xef\xf5K\xac\xfd#\xa6\x97"
TTL temp:copy
```

```text
(integer) 59
```

### DUMP and RESTORE a hash

```redis
HSET user:1 name "alice" email "alice@example.com"
DUMP user:1
```

```text
(binary output)
```

Store the dump output and restore:

```redis
RESTORE user:1:backup 0 <dump-output>
HGETALL user:1:backup
```

```text
1) "name"
2) "alice"
3) "email"
4) "alice@example.com"
```

### RESTORE with REPLACE to overwrite an existing key

```redis
SET destination "old-value"
RESTORE destination 0 <dump-payload> REPLACE
GET destination
```

```text
"new-value-from-dump"
```

### RESTORE fails without REPLACE if destination exists

```redis
RESTORE destination 0 <dump-payload>
```

```text
(error) BUSYKEY Target key name is busy.
```

## Cross-Server Migration with DUMP and RESTORE

Using redis-cli to copy a key from one server to another:

```bash
# Dump the key from source server
DUMP_DATA=$(redis-cli -h source-host -p 6379 DUMP "mykey")

# Restore on destination server
redis-cli -h dest-host -p 6379 RESTORE "mykey" 0 "$DUMP_DATA"
```

For automated migrations, the MIGRATE command uses DUMP and RESTORE internally and is easier to use for this purpose.

## Use Cases

**Key-level backups** - Serialize individual important keys to application-level storage for targeted backup/restore.

**Cross-cluster migration** - Move individual keys between Redis instances without requiring a full RDB or AOF snapshot.

**Snapshot testing** - Dump a complex data structure before a test and restore it to reset state after the test.

**Cache seeding** - Serialize frequently used keys and restore them on a new Redis instance to warm it up quickly.

**Data archiving** - Store serialized key dumps in object storage (S3, GCS) for point-in-time recovery at the key level.

## Limitations

- The serialization format is specific to Redis versions. RESTORE may fail if the source Redis version is newer than the destination.
- There is no streaming support; the entire value must fit in memory during serialization.
- For bulk migration, MIGRATE is more convenient and handles TTL automatically.

## Summary

DUMP serializes a Redis key's value into a binary payload with a CRC64 checksum; RESTORE deserializes that payload into a new key with an optional TTL. Together they enable key-level backup, migration between Redis instances, and test data management. The REPLACE option allows overwriting existing keys. For large-scale migration, prefer the MIGRATE command which wraps DUMP/RESTORE in a more convenient interface with atomicity guarantees.
