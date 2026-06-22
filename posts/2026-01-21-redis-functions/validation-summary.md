# Validation Summary: How to Use Redis Functions (Redis 7.0+)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Functions
- Redis Lua scripting
- Redis CLI
- redis-py
- Python

## Sources Consulted
- Redis Functions introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis FUNCTION LOAD command: https://redis.io/docs/latest/commands/function-load/
- Redis FUNCTION LIST command: https://redis.io/docs/latest/commands/function-list/
- Redis FUNCTION RESTORE command: https://redis.io/docs/latest/commands/function-restore/
- Redis FCALL command: https://redis.io/docs/latest/commands/fcall/
- Redis FCALL_RO command: https://redis.io/docs/latest/commands/fcall_ro/
- Redis FUNCTION STATS command: https://redis.io/docs/latest/commands/function-stats/
- Redis FUNCTION KILL command: https://redis.io/docs/latest/commands/function-kill/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- Redis Functions were described as having built-in library versioning. Redis libraries have names, but not built-in version metadata, so this was changed to source-control-based version tracking and whole-library replacement.
- Cluster behavior was described as automatic replication across cluster nodes. Redis propagates loaded functions to replicas, but Redis Cluster administrators must load libraries on all master nodes, so the cluster-related claims and comparison table were corrected.
- The first FCALL_RO example called `get_counter`, but the library did not define it. A read-only `get_counter` function with the `no-writes` flag was added.
- The Python integration loaded `get_user` without the `no-writes` flag and then called it with `FCALL_RO`, which Redis rejects. The function registration was changed to the named form with `flags = {'no-writes'}`.
- The function flags table described `no-cluster` incorrectly and omitted `allow-cross-slot-keys`. The description was corrected and the missing flag was added.
- Some examples used deprecated `HMSET`. These were updated to `HSET` with multiple field-value pairs.
- Several Lua examples returned associative tables that are not returned as normal maps under Redis's default Lua-to-RESP2 conversion. These were changed to arrays, strings, errors, or JSON strings as appropriate.
- Session examples generated or derived Redis key names inside functions. Redis Functions should access keys passed explicitly through the key list, especially for Cluster correctness. The examples were changed to use `keys` entries for session and user-session keys.
- The debugging section showed `redis-cli --ldb --eval`, which is for ephemeral Lua scripts and does not debug Redis Functions. It was replaced with `FUNCTION STATS` and `FUNCTION KILL`, and the conclusion was updated accordingly.

## Review Notes
The examples are now aligned with Redis 7+ function semantics and redis-py command signatures. The session examples still assume the application generates session IDs and passes all affected keys explicitly, which is the correct pattern for Redis Functions and Cluster compatibility.
