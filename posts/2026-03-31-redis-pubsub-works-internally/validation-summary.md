# Validation Summary: How Redis Pub/Sub Works Internally

## Status
validated

## Post Type
Technical explainer / Architecture deep-dive

## Technologies Covered
- Redis Pub/Sub (SUBSCRIBE, PUBLISH, PSUBSCRIBE, PUBSUB introspection commands)
- Redis output buffer configuration
- redis-py Python client library

## Sources Consulted
- Redis SUBSCRIBE command documentation: https://redis.io/docs/latest/commands/subscribe/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis PSUBSCRIBE command documentation: https://redis.io/docs/latest/commands/psubscribe/
- Redis Pub/Sub overview: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis PUBSUB CHANNELS documentation: https://redis.io/docs/latest/commands/pubsub-channels/
- Redis PUBSUB NUMSUB documentation: https://redis.io/docs/latest/commands/pubsub-numsub/
- Redis PUBSUB NUMPAT documentation: https://redis.io/docs/latest/commands/pubsub-numpat/
- redis-py PubSub documentation: https://redis-py.readthedocs.io/en/stable/advanced_features.html#publish-subscribe

## Issues Found

### 1. Incorrect redis-py pubsub example (High severity)
**What was wrong:** The Python code example claimed that `r.set('key', 'value')` would fail after calling `r.pubsub()` and subscribing. This is incorrect — redis-py creates a separate, dedicated connection for the PubSub object. The original Redis client `r` retains its own connection(s) and can still execute normal commands without error.

**What was changed:** Rewrote the Python example to correctly show that `r.set()` still works after creating a pubsub object, with a comment explaining that redis-py uses a separate connection for pubsub and that the subscribe-mode restriction applies at the Redis protocol level to the subscribed connection itself.

### 2. Missing allowed commands in subscribe mode (Medium severity)
**What was wrong:** The list of commands allowed in subscribe mode was missing `SSUBSCRIBE`, `SUNSUBSCRIBE` (sharded pub/sub, added in Redis 7.0), and `QUIT`.

**What was changed:** Added `SSUBSCRIBE`, `SUNSUBSCRIBE`, and `QUIT` to the allowed commands list.

### 3. Undefined variable in code example (Low severity)
**What was wrong:** The subscriber Python code block referenced an undefined variable `r`. The previous code block defined `r_publisher`, not `r`.

**What was changed:** Added `import redis` and `r = redis.Redis(decode_responses=True)` to make the subscriber code block self-contained and runnable.

## Review Notes
- The post does not mention that RESP3 clients (connected via the HELLO command) can issue any commands while in subscribed state, bypassing the subscribe-mode restrictions. This is a notable advanced detail but does not constitute an error in the current text.
- PUBLISH's time complexity is O(N+M) where M is the total number of pattern subscriptions across all clients — meaning pattern subscriptions add cost to every PUBLISH, even for unrelated channels. The post doesn't mention this, which could be relevant for performance-sensitive readers.
- In a Redis Cluster, PUBLISH's return count only includes clients connected to the same node. The post doesn't mention cluster behavior, which is acceptable since it focuses on single-instance internals.
- PUBSUB NUMSUB excludes pattern subscribers from its count — not mentioned in the post but could be a subtle gotcha for users.
- The post describes pattern subscriptions as stored in a "separate dictionary." Historically (pre-7.0), Redis used a linked list for patterns, not a dictionary. Redis 7.0+ uses a more optimized structure. The behavioral description is accurate regardless of version.
