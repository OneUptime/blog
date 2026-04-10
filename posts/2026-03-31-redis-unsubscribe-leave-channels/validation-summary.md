# Validation Summary: How to Use UNSUBSCRIBE in Redis to Leave Channels

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Pub/Sub
- Redis UNSUBSCRIBE command
- Redis SUBSCRIBE command
- Redis RESET command (6.2+)

## Sources Consulted
- Redis official documentation for UNSUBSCRIBE: https://redis.io/docs/latest/commands/unsubscribe/
- Redis official documentation for SUBSCRIBE: https://redis.io/docs/latest/commands/subscribe/
- Redis official documentation for RESET: https://redis.io/docs/latest/commands/reset/
- Redis Pub/Sub guide: https://redis.io/docs/latest/develop/interact/pubsub/

## Issues Found
No technical issues found.

## Review Notes
- The post omits mention of sharded Pub/Sub commands (`SSUBSCRIBE`, `SUNSUBSCRIBE`) introduced in Redis 7.0, which are also allowed in Pub/Sub mode. This is not an error since the post is focused on standard channel UNSUBSCRIBE, but could be noted in a future update.
- All command syntax, response formats, subscription counts in the diagram, and connection mode rules are accurate.
- The RESET command version attribution (Redis 6.2+) is correct.
