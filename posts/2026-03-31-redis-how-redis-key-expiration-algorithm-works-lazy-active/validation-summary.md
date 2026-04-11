# Validation Summary: How Redis Key Expiration Algorithm Works (Lazy + Active)

## Status
validated

## Post Type
Technical deep-dive / Reference

## Technologies Covered
- Redis (server internals, key expiration subsystem)
- Redis CLI commands (SET, GET, TTL, PTTL, EXPIREAT, PEXPIREAT, CONFIG, INFO)
- Redis Cluster (replication of key expiration)
- Redis maxmemory eviction policies
- Node.js / ioredis (monitoring example)
- C (simplified Redis source code)

## Sources Consulted
- Redis official documentation on key expiration: https://redis.io/docs/manual/keyspace-notifications/ and https://redis.io/commands/expire/
- Redis source code (`src/db.c`, `src/expire.c`) for lazy and active expiration logic
- Redis documentation on `hz` and `dynamic-hz` configuration: https://redis.io/docs/reference/modules/modules-api-ref/
- Redis documentation on replication and expiration behavior on replicas: https://redis.io/docs/management/replication/
- Redis documentation on eviction policies: https://redis.io/docs/reference/eviction/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
1. **Incorrect replica lazy expiration claim (Redis Cluster section)**: The post stated that replicas "also expire on access (lazy) independently." This is inaccurate. Since Redis 3.2, replicas return `nil` for logically expired keys on read, but they do **not** actually delete the key from their dataset. The actual deletion only occurs when the primary replicates the DEL command. This is an important distinction because the expired key still occupies memory on the replica until the primary's DEL arrives. Fixed the text to clarify that replicas filter expired keys on read but rely on the primary for actual deletion.

## Review Notes
- The simplified C code for `lookupKey` merges the expiry check into the lookup function for clarity. In actual Redis source, `expireIfNeeded()` is called separately before `lookupKey()`. This is acceptable since the code is explicitly labeled "Simplified."
- The `allkeys-random` and `noeviction` maxmemory policies are not listed, but the post doesn't claim to be exhaustive, so this is fine.
- The `volatile-lfu` and `allkeys-lfu` policies were added in Redis 4.0; the post doesn't specify version requirements for these, which is acceptable for a general reference.
- The `dynamic-hz` default of `yes` in Redis 5.0+ is correctly stated.
