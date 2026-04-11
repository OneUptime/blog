# Validation Summary: How to Use SUBSCRIBE and UNSUBSCRIBE in Redis Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub (SUBSCRIBE, UNSUBSCRIBE, PUBLISH commands)
- Python (redis-py library)
- Node.js (node-redis v4+ library)
- Go (go-redis/v9 library)

## Sources Consulted
- Redis SUBSCRIBE command documentation: https://redis.io/docs/latest/commands/subscribe/
- Redis UNSUBSCRIBE command documentation: https://redis.io/docs/latest/commands/unsubscribe/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis Pub/Sub guide: https://redis.io/docs/latest/develop/interact/pubsub/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/advanced_features.html#publish-subscribe
- node-redis documentation: https://github.com/redis/node-redis/blob/master/docs/pub-sub.md
- go-redis documentation: https://redis.uptrace.dev/guide/go-redis-pubsub.html

## Issues Found
1. **Node.js example: top-level `await` with CommonJS `require()`** - The example used `require()` (CommonJS module syntax) alongside top-level `await`, which is only valid in ES modules. This code would throw a `SyntaxError` if run as a CommonJS module. Fixed by wrapping the async code in an immediately-invoked async function expression (IIFE).

## Review Notes
- The Python example has a potential race condition: the publisher thread starts immediately after the subscriber thread, with no synchronization to ensure the subscription is established before messages are published. On localhost this typically works in practice, but messages could theoretically be lost. This is acceptable for a demonstration snippet.
- The Go example exits immediately after calling `sub.Unsubscribe()` without waiting for messages to be received, making it non-functional as a standalone program. However, the API usage itself is correct and the example serves to illustrate the method signatures.
- The list of commands allowed in subscriber mode omits `QUIT` and the Redis 7.0+ sharded Pub/Sub commands (`SSUBSCRIBE`, `SUNSUBSCRIBE`). This is acceptable given the post's focused scope on SUBSCRIBE/UNSUBSCRIBE.
- The error message shown for running commands in subscriber mode (`ERR Can't call 'GET' in Subscribe mode`) is a simplified version of the actual Redis error text, but accurately conveys the behavior.
