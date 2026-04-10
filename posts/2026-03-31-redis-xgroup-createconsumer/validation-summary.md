# Validation Summary: How to Use XGROUP CREATECONSUMER in Redis

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis Streams
- XGROUP CREATECONSUMER command (available since Redis 6.2.0)
- XGROUP CREATE command
- XINFO CONSUMERS command
- XREADGROUP command
- redis-cli

## Sources Consulted
- Redis official documentation for XGROUP CREATECONSUMER: https://redis.io/docs/latest/commands/xgroup-createconsumer/
- Redis official documentation for XGROUP CREATE: https://redis.io/docs/latest/commands/xgroup-create/
- Redis official documentation for XINFO CONSUMERS: https://redis.io/docs/latest/commands/xinfo-consumers/

## Issues Found
No technical issues found.

## Review Notes
- The XINFO CONSUMERS example output shows the fields `name`, `pending`, and `idle`, which are correct for Redis 6.2+. Starting with Redis 7.2.0, an additional `inactive` field was added and the semantics of `idle` changed (from time since last successful interaction to time since last attempted interaction). This is not an error in the post since the shown fields are accurate for the version when XGROUP CREATECONSUMER was introduced, but readers on Redis 7.2+ will see an additional field in their output.
- The syntax description uses `groupname` and `consumername` as parameter names whereas the official docs use `group` and `consumer`. This is a minor stylistic difference and does not affect correctness.
