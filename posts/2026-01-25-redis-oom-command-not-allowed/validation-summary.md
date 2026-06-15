# Validation Summary: How to Fix 'OOM command not allowed' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Redis
- redis-cli
- redis-py
- Python
- Redis memory management and eviction policies

## Sources Consulted
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis OBJECT IDLETIME command documentation: https://redis.io/docs/latest/commands/object-idletime/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis MEMORY PURGE command documentation: https://redis.io/docs/latest/commands/memory-purge/
- Redis Open Source 8.6 release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.6-release-notes/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The `CONFIG SET maxmemory 4gb` example claimed human-readable memory units were Redis 7+. Redis documents human-readable `maxmemory` values without that Redis 7+ caveat, so the version-specific note was removed.
- The eviction policy list omitted the current `allkeys-lrm` and `volatile-lrm` policies from Redis documentation. Added both to the policy list and Mermaid diagram with their Redis 8.6+ version caveat.
- The `delete_old_keys()` example used `OBJECT IDLETIME` without accounting for its documented limitation under LFU eviction policies. Wrapped the call in `ResponseError` handling so the cleanup loop does not fail when the command is unavailable.
- The monitoring example read `evicted_keys` from `INFO memory`, but Redis reports `evicted_keys` in the stats section. Updated `alert_high_memory()` to read `INFO stats`.
- The emergency cleanup example used `DEBUG QUICKLIST-FORCE-FREE` and described it as deleting expired keys. Redis documents `DEBUG` as an internal testing command, and that usage was not appropriate for production cleanup. Replaced it with documented cache-key deletion plus `MEMORY PURGE` to ask the allocator to release freed dirty pages where supported.
- Removed an unused `time` import left in `delete_old_keys()` after correcting the idle-time cleanup example.

## Review Notes
- The examples are synchronous redis-py examples and remain suitable for simple scripts. Production applications should also consider connection timeouts, authentication/TLS, Redis Cluster behavior, and operational safeguards before running cleanup code automatically.
