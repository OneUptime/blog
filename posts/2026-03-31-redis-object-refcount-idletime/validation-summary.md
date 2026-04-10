# Validation Summary: How to Use OBJECT REFCOUNT and OBJECT IDLETIME in Redis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (OBJECT REFCOUNT, OBJECT IDLETIME subcommands)
- Redis memory management and shared integer object pool
- Redis LRU/LFU eviction policies
- redis-cli command-line interface

## Sources Consulted
- Official Redis OBJECT REFCOUNT documentation: https://redis.io/docs/latest/commands/object-refcount/
- Official Redis OBJECT IDLETIME documentation: https://redis.io/docs/latest/commands/object-idletime/
- Official Redis OBJECT FREQ documentation: https://redis.io/docs/latest/commands/object-freq/
- Official Redis eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis source code (redis/redis on GitHub): `src/server.h` for `OBJ_SHARED_INTEGERS` (10000) and `OBJ_SHARED_REFCOUNT` (INT_MAX = 2147483647)
- Redis source code: `src/object.c` for `objectCommandLookup` using `LOOKUP_NOTOUCH|LOOKUP_NONOTIFY` flags

## Issues Found
No technical issues found.

## Review Notes
- The shared integer range 0-9999 is correct (`OBJ_SHARED_INTEGERS` is defined as 10000 in `src/server.h`).
- The refcount value of 2147483647 for shared integers is correct (`OBJ_SHARED_REFCOUNT` = `INT_MAX`).
- The claim that OBJECT IDLETIME does not update idle time is confirmed by the `LOOKUP_NOTOUCH` flag in the source code.
- The claim that OBJECT IDLETIME errors under LFU policies is confirmed by the official docs and source code.
- The bash script for finding cold keys is functional, though keys with special characters (spaces, newlines) could cause issues with the `while read` pattern. This is a common simplification in Redis examples and not a correctness error.
- OBJECT IDLETIME's time resolution depends on the Redis server's LRU clock update frequency (default 10 Hz), so reported idle times are accurate to approximately 1 second.
