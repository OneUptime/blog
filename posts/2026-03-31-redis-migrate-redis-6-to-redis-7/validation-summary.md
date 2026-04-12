# Validation Summary: How to Migrate from Redis 6 to Redis 7

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Redis 6
- Redis 7
- Redis replication (REPLICAOF)
- Redis AOF (Append Only File) persistence
- Redis ACLs
- Ubuntu/Debian apt package management

## Sources Consulted
- Redis official documentation — ACL LOG command (https://redis.io/docs/latest/commands/acl-log/)
- Redis official documentation — REPLICAOF command (https://redis.io/docs/latest/commands/replicaof/)
- Redis official documentation — OBJECT FREQ command (https://redis.io/docs/latest/commands/object-freq/)
- Redis official documentation — OBJECT ENCODING command (https://redis.io/docs/latest/commands/object-encoding/)
- Redis official documentation — SINTERCARD command (https://redis.io/docs/latest/commands/sintercard/)
- Redis official documentation — LMPOP command (https://redis.io/docs/latest/commands/lmpop/)
- Redis official documentation — ZMPOP command (https://redis.io/docs/latest/commands/zmpop/)
- Redis official documentation — Install on Linux (https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/apt/)
- Redis 7.0 release notes and persistence documentation (https://redis.io/topics/persistence/)

## Issues Found

1. **ACL LOG RESET claim was misleading**: The "Key Changes in Redis 7" section stated that ACL LOG "has a `RESET` subcommand," implying it was new in Redis 7. In fact, `ACL LOG RESET` has existed since Redis 6.0 when ACLs were introduced. Changed the bullet to mention selector-based ACLs, which are actually new in Redis 7.

2. **Incorrect OBJECT command claim**: The cluster improvements bullet stated "`OBJECT FREQ` in `OBJECT ENCODING`", which is nonsensical — these are completely separate, unrelated subcommands. `OBJECT FREQ` returns LFU access frequency counters; `OBJECT ENCODING` returns internal data structure encoding. Replaced with `CLUSTER SHARDS` command, which is an actual new Redis 7 cluster feature.

3. **Wrong apt package epoch**: The installation command used `redis=7:7.*` but the official Redis packages from packages.redis.io use epoch `6:`, not `7:`. Corrected to `redis=6:7.*`.

4. **Incorrect rollback command**: The rollback section used `CONFIG SET slave-serve-stale-data yes` claiming it would "re-enable Redis 6 as primary." This is wrong on two counts: (a) `slave-serve-stale-data` is a deprecated alias for `replica-serve-stale-data`, and (b) this config option controls whether a replica serves stale data when disconnected from its master — it has nothing to do with promoting or re-enabling a server as primary. Since Redis 6 was never demoted (only Redis 7 was promoted from replica), Redis 6 is still a standalone primary. Replaced with a simple connectivity and write verification check.

## Review Notes
- The overall migration strategy (replica promotion) is sound and follows Redis best practices.
- The post could benefit from mentioning that Redis 7.0 changed the default `list-max-ziplist-size` to `list-max-listpack-size` (ziplist replaced by listpack internally), which could affect monitoring scripts that check encoding types.
- The `CLUSTER SHARDS` command (replacing the deprecated `CLUSTER SLOTS`) is a notable Redis 7 cluster change worth mentioning in more detail for cluster users.
