# Validation Summary: How to Create Redis Function Libraries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Functions
- Redis Lua API
- Redis CLI
- Redis persistence and replication

## Sources Consulted
- Redis Functions introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- FUNCTION LOAD command reference: https://redis.io/docs/latest/commands/function-load/
- FCALL command reference: https://redis.io/docs/latest/commands/fcall/
- FUNCTION LIST command reference: https://redis.io/docs/latest/commands/function-list/
- FUNCTION RESTORE command reference: https://redis.io/docs/latest/commands/function-restore/

## Issues Found
- The post said traditional Lua scripts must be loaded on every connection. Redis `EVAL` sends the script every time it runs, while cached scripts are server-side and can be lost after `SCRIPT FLUSH`, restart, or failover. Updated the wording to match Redis documentation.
- The persistence bullet implied functions always survive restarts. Redis functions are persisted with Redis persistence mechanisms, so the bullet now says they survive restarts when persistence is enabled.
- The rate limiter registered `flags = { 'no-writes' }` even though it calls `SET` and `INCR`. Redis rejects write commands from functions flagged `no-writes`, so the flag was removed.
- The `allow-stale` flag description was too broad. Updated it to clarify that stale-replica execution is for functions that do not access stale data.
- The flag list omitted current documented flags. Added `allow-oom` and `allow-cross-slot-keys`.
- The replication section said functions ensure consistency across a cluster. Redis replicates functions to replicas, but Redis Cluster requires loading libraries on all primary nodes. Updated the text with that caveat.
- The restore example used `redis-cli FUNCTION RESTORE < functions.dump`, which does not pass the dumped payload as the command argument. Updated it to `redis-cli -x FUNCTION RESTORE < functions.dump`.

## Review Notes
The remaining examples use the documented `#!lua name=<library>`, `redis.register_function`, `FUNCTION LOAD REPLACE`, `FCALL`, `FUNCTION LIST LIBRARYNAME`, `FUNCTION DUMP`, and `FUNCTION RESTORE` forms for Redis 7.0 and later.
