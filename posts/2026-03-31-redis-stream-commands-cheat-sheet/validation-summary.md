# Validation Summary: Redis Stream Commands Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis Streams
- Redis CLI commands (XADD, XREAD, XREADGROUP, XACK, XCLAIM, XAUTOCLAIM, XPENDING, XRANGE, XREVRANGE, XLEN, XTRIM, XDEL, XINFO, XGROUP)

## Sources Consulted
- Redis official documentation for XADD: https://redis.io/docs/latest/commands/xadd/
- Redis official documentation for XREAD: https://redis.io/docs/latest/commands/xread/
- Redis official documentation for XREADGROUP: https://redis.io/docs/latest/commands/xreadgroup/
- Redis official documentation for XAUTOCLAIM: https://redis.io/docs/latest/commands/xautoclaim/
- Redis official documentation for XPENDING: https://redis.io/docs/latest/commands/xpending/
- Redis official documentation for XCLAIM: https://redis.io/docs/latest/commands/xclaim/
- Redis official documentation for XRANGE: https://redis.io/docs/latest/commands/xrange/
- Redis official documentation for XREVRANGE: https://redis.io/docs/latest/commands/xrevrange/
- Redis official documentation for XTRIM: https://redis.io/docs/latest/commands/xtrim/
- Redis official documentation for XINFO: https://redis.io/docs/latest/commands/xinfo-stream/
- Redis official documentation for XGROUP: https://redis.io/docs/latest/commands/xgroup-create/
- Redis Streams introduction: https://redis.io/docs/latest/develop/data-types/streams/

## Issues Found

1. **Invalid partial ID syntax in XADD example (line 23):** The post used `XADD events 1711900000000-* action "login" user_id 42` with `-*` as the sequence part. Redis does not support `<ms>-*` syntax. Partial explicit IDs (available since Redis 7.0) use only the millisecond part without a dash or wildcard, e.g., `XADD events 1711900000000 action "login" user_id 42`. Fixed the command and added a note that partial IDs require Redis 7.0+.

2. **Incorrect version annotation for XAUTOCLAIM (line 114):** The comment stated "Redis 7.0+" but XAUTOCLAIM was introduced in Redis 6.2.0, not 7.0. Changed the annotation to "Redis 6.2+".

## Review Notes
- All other commands (XADD, XREAD, XREADGROUP, XACK, XCLAIM, XPENDING, XRANGE, XREVRANGE, XLEN, XTRIM, XDEL, XINFO STREAM/GROUPS/CONSUMERS, XGROUP CREATE/DESTROY/CREATECONSUMER/DELCONSUMER/SETID) are syntactically correct and match official Redis documentation.
- The MINID trimming strategy and the `~` approximate trimming operator are correctly documented.
- The MKSTREAM option for XGROUP CREATE is correctly shown.
- The distinction between `>` (new messages) and `0` (re-read pending) in XREADGROUP is correctly explained.
- The summary's comparison to Kafka and description of at-least-once delivery semantics is accurate.
