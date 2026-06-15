# Validation Summary: How to Use Redis Lists for Message Queues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis lists
- Redis sorted sets
- Redis Streams
- redis-py
- Python
- Background job and message queue patterns

## Sources Consulted
- Redis BRPOP command documentation: https://redis.io/docs/latest/commands/brpop/
- Redis BLMOVE command documentation: https://redis.io/docs/latest/commands/blmove/
- Redis LMOVE command documentation: https://redis.io/docs/latest/commands/lmove/
- Redis BRPOPLPUSH command documentation: https://redis.io/docs/latest/commands/brpoplpush/
- Redis RPOPLPUSH command documentation: https://redis.io/docs/latest/commands/rpoplpush/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis lists documentation: https://redis.io/docs/latest/develop/data-types/lists/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/

## Issues Found
- The post used `RPOPLPUSH` / `BRPOPLPUSH` as the current reliable-queue primitive. Redis marks these commands as deprecated as of Redis 6.2 and recommends `LMOVE` / `BLMOVE` instead. Updated the prose, code, summary table, and key points to use `BLMOVE`.
- The reliable queue updated the processing-list message by running `LREM` followed by `LPUSH` as separate commands after the atomic move. A worker crash between those commands could remove the message from the processing list and lose it. Replaced that update with a Lua script so the processing entry replacement is atomic.
- The delayed queue used `ZRANGEBYSCORE`, which Redis marks as deprecated as of Redis 6.2 in favor of `ZRANGE ... BYSCORE`. Replaced the delayed-message selection with `ZRANGE` inside a Lua script.
- The delayed queue described a pipeline transaction as an atomic move from the sorted set to the ready list, but the original transaction always pushed to the ready list even if `ZREM` removed zero items. With concurrent movers, that could duplicate messages. Replaced it with a Lua script that pushes only when `ZREM` succeeds.
- The Streams recommendation said to use streams for "Guaranteed delivery." Redis Streams provide built-in delivery tracking and acknowledgments, but delivery guarantees still depend on application handling and Redis persistence/replication configuration. Changed the wording to "Built-in delivery tracking."

## Review Notes
- The examples are illustrative and assume a Redis server is available on localhost and that the undefined `send_email()` function is supplied by the reader's application.
- The queue examples use Redis lists as durable Redis data structures, but actual durability depends on Redis persistence and deployment settings.
