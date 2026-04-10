# Validation Summary: How to Use Redis Debug Mode Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (DEBUG command and subcommands)
- Redis CLI
- Redis configuration (redis.conf, ACLs)

## Sources Consulted
- Redis DEBUG command documentation — https://redis.io/docs/latest/commands/debug/
- Redis source code (debug.c) — https://github.com/redis/redis/blob/unstable/src/debug.c
- Redis OBJECT ENCODING documentation — https://redis.io/docs/latest/commands/object-encoding/
- Redis ACL documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis security documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis ziplist to listpack migration — https://github.com/redis/redis/issues/8702

## Issues Found

1. **`DEBUG JMAP` does not exist (Critical).** This subcommand is entirely fabricated — it does not exist in any version of Redis. "JMAP" is a Java JDK tool, not a Redis feature. The section was removed. For actual memory analysis, Redis provides `MEMORY USAGE`, `MEMORY STATS`, `MEMORY DOCTOR`, and `INFO memory`.

2. **`DEBUG LOADAOF` incorrectly listed as "Safe" (Critical).** `DEBUG LOADAOF` calls `emptyData()` which flushes ALL existing data from ALL databases before reloading the AOF file. If the AOF is missing, corrupt, or incomplete, data will be lost. Moved this subcommand from "Safe Subcommands" to "Risky Subcommands" with an explicit warning about the data flush.

3. **`encoding:ziplist` is outdated.** In Redis 7.0+, the `ziplist` internal encoding was replaced by `listpack` for lists, hashes, and sorted sets. Updated the `DEBUG OBJECT` output example from `encoding:ziplist` to `encoding:listpack`.

4. **`rename-command` is deprecated.** The post recommended `rename-command` as the primary way to restrict DEBUG access. Since Redis 6.0, ACLs are the recommended approach (e.g., `ACL SETUSER default -DEBUG`). The redis.conf file itself states to prefer ACLs over `rename-command`. Updated the section to recommend ACLs as the primary method, with `rename-command` noted as a legacy fallback.

## Review Notes
- `DEBUG RELOAD` is listed under "Safe Subcommands," which is reasonable for data integrity (it saves before reloading), but it does call `emptyData()` internally before reloading the RDB. The save step protects against data loss, but it blocks the server for the duration of both the save and reload operations, which can be significant for large datasets.
- The post could benefit from mentioning that `OBJECT ENCODING`, `OBJECT REFCOUNT`, and `OBJECT IDLETIME` are the supported alternatives to `DEBUG OBJECT` for production use.
- The `DEBUG SLEEP` description correctly warns against production use but could note that it blocks the entire event loop including replication and pub/sub, not just client commands.
