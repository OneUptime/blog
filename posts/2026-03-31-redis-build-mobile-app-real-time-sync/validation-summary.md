# Validation Summary: How to Build a Mobile App Real-Time Sync with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub
- Node.js
- ioredis (Redis client library for Node.js)
- ws (WebSocket library for Node.js)
- Redis data structures: Hashes, Sorted Sets

## Sources Consulted
- ioredis documentation: https://github.com/redis/ioredis
- ws library documentation: https://github.com/websockets/ws
- Redis PUBLISH/SUBSCRIBE documentation: https://redis.io/docs/latest/commands/subscribe/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis HSET/HGETALL documentation: https://redis.io/docs/latest/commands/hset/
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/

## Issues Found
1. **Description and intro incorrectly mention "keyspace notifications"**: The post description and opening paragraph both referenced "keyspace notifications" as a technique used in the post, but the entire tutorial only uses Redis Pub/Sub. Keyspace notifications are a separate Redis feature (requiring `notify-keyspace-events` configuration) and are never demonstrated or discussed in the post. Removed the keyspace notifications reference from both the description metadata and the introductory paragraph.

## Review Notes
- All ioredis API calls (`subscribe`, `publish`, `hset`, `hgetall`, `zadd`, `zrangebyscore`, `expire`) use correct signatures and are current.
- The ws library usage (`WebSocket.Server`, connection/message/close events, `readyState` check) is correct.
- The pattern of using separate Redis connections for pub and sub is correct and required — ioredis (and Redis itself) requires a dedicated connection for subscriptions since a subscribed client cannot issue other commands.
- The `req.url.replace("/", "")` on line 58 only replaces the first `/` character. This works for the simple URL pattern assumed (e.g., `/123`), but would not handle nested paths. This is acceptable for a tutorial context.
- The horizontal scaling claim in the summary is accurate — multiple app servers subscribing to the same Redis channels will each receive all published messages.
