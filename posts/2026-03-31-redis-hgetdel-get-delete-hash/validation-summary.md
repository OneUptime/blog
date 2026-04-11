# Validation Summary: How to Use HGETDEL in Redis to Get and Delete Hash Fields Atomically

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (specifically Redis 8.0+)
- HGETDEL command
- Redis hash data structure
- Related commands: HSET, HEXISTS, HGETALL, EXISTS, HMGET, HDEL

## Sources Consulted
- Official Redis HGETDEL documentation: https://redis.io/docs/latest/commands/hgetdel/

## Issues Found
1. **Incorrect version number**: The post stated HGETDEL was introduced in Redis 7.4. Per the official Redis documentation, HGETDEL was introduced in **Redis 8.0.0**. Fixed both occurrences (introduction paragraph and summary section) from "7.4" to "8.0".
2. **Missing HSET output in "Handling non-existent fields" example**: The output block was missing the `(integer) 2` return value from the HSET command, inconsistent with all other examples in the post which include HSET output. Added the missing line.

## Review Notes
- The syntax `HGETDEL key FIELDS numfields field [field ...]` is correct per official docs.
- The behavior described (atomic get+delete, nil for missing fields, auto-deletion of empty hash) is all accurate.
- The mermaid diagrams correctly illustrate both the command flow and the race condition that HGETDEL solves.
- The comparison to `GETDEL` as the string equivalent is accurate.
- The claim that the pre-HGETDEL pattern required Lua or a non-atomic HMGET+HDEL pipeline is correct.
