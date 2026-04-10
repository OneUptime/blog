# Validation Summary: How to Use PSUBSCRIBE in Redis for Pattern-Based Subscriptions

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis Pub/Sub
- PSUBSCRIBE command
- PUBSUB NUMPAT command
- Redis glob-style pattern matching

## Sources Consulted
- Redis official documentation for PSUBSCRIBE: https://redis.io/docs/latest/commands/psubscribe/
- Redis official documentation for SUBSCRIBE: https://redis.io/docs/latest/commands/subscribe/
- Redis official documentation for PUBSUB NUMPAT: https://redis.io/docs/latest/commands/pubsub-numpat/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/

## Issues Found
No technical issues found.

## Review Notes
- The glob pattern table (`?`, `*`, `[ae]`) exactly matches the patterns documented in the official Redis PSUBSCRIBE documentation.
- The pmessage format (4 parts: type, pattern, channel, payload) is correctly described.
- The post does not mention that if a client has both a SUBSCRIBE and a PSUBSCRIBE that match the same published message, the client will receive the message twice (once as `message`, once as `pmessage`). This is a known behavior worth noting but is not an error — the post simply doesn't cover this edge case.
- PUBSUB NUMPAT is correctly described as returning the count of unique pattern subscriptions server-wide.
- The keyspace notification pattern `__keyevent@*__:expired` is a valid and common use case, though it requires enabling keyspace notifications via `notify-keyspace-events` configuration. The post doesn't mention this prerequisite, but since this is listed as a use case example rather than a tutorial on keyspace notifications, this omission is acceptable.
