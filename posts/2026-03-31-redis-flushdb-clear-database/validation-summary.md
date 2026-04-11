# Validation Summary: How to Use FLUSHDB in Redis to Clear a Database

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (FLUSHDB command)
- Redis ACLs
- Redis persistence (RDB, AOF)

## Sources Consulted
- Official Redis FLUSHDB documentation (https://redis.io/docs/latest/commands/flushdb/)
- Official Redis ACL SETUSER documentation (https://redis.io/docs/latest/commands/acl-setuser/)
- Redis 4.0 release notes (ASYNC option)
- Redis 6.2 release notes (SYNC option)

## Issues Found
1. **Contradictory section title**: The section "Flush a specific database without switching" contained code that explicitly uses `SELECT` to switch databases. Redis's `FLUSHDB` does not accept a database index parameter, so switching is required. Renamed the section to "Flush a specific database by switching temporarily" to accurately describe the technique.

## Review Notes
- The description of SYNC as "default behavior before 4.0" is slightly simplified. Synchronous behavior was the default in all Redis versions, not just pre-4.0. Starting in Redis 6.2, the `lazyfree-lazy-user-flush` config option can change the default to asynchronous, and the explicit SYNC flag was added to override that config. The current wording is acceptable but could be more precise in a future revision.
- All code examples are syntactically correct and would work as described in redis-cli.
- The ACL example correctly demonstrates restricting FLUSHDB and FLUSHALL access.
- The persistence interaction notes (RDB and AOF) are accurate.
