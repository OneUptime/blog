# Validation Summary: How to Use PUBSUB NUMSUB and PUBSUB NUMPAT in Redis

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Pub/Sub (`PUBSUB NUMSUB`, `PUBSUB NUMPAT`, `PUBSUB CHANNELS`)
- Redis Cluster sharded Pub/Sub (`PUBSUB SHARDNUMSUB`, Redis 7.0+)

## Sources Consulted
- Redis official documentation for PUBSUB NUMSUB: https://redis.io/docs/latest/commands/pubsub-numsub/
- Redis official documentation for PUBSUB NUMPAT: https://redis.io/docs/latest/commands/pubsub-numpat/
- Redis official documentation for PUBSUB CHANNELS: https://redis.io/docs/latest/commands/pubsub-channels/
- Redis official documentation for PUBSUB SHARDNUMSUB: https://redis.io/docs/latest/commands/pubsub-shardnumsub/
- Redis official documentation for PSUBSCRIBE: https://redis.io/docs/latest/commands/psubscribe/

## Issues Found

### Issue 1: Incorrect claim about messages being dropped when NUMSUB is 0
- **What was wrong:** The post stated "A count of `0` means publishing to this channel will be silently dropped." This is incorrect because `PUBSUB NUMSUB` only counts direct subscribers (via `SUBSCRIBE`), not pattern subscribers (via `PSUBSCRIBE`). A channel with 0 direct subscribers could still have pattern subscribers that receive published messages.
- **What was changed:** Replaced the sentence with: "A count of `0` means no direct subscribers exist. Messages may still reach clients subscribed via `PSUBSCRIBE` with a matching pattern, since `NUMSUB` does not count pattern subscriptions."
- **Why:** The original claim could lead users to incorrectly assume no one receives their messages, when pattern subscribers may still be active.

### Issue 2: Inconsistent formatting in "Zero Pattern Subscriptions" example
- **What was wrong:** The command and output were combined in a single `redis` code block, unlike every other example in the post which separates the command and output into distinct blocks.
- **What was changed:** Split the code block into a `redis` command block and a separate `text` output block with an "Output:" label, matching the formatting pattern used throughout the rest of the post.
- **Why:** Consistency and clarity — the mixed format could be misread as the output being part of the command syntax.

## Review Notes
- The post correctly notes that `PUBSUB SHARDNUMSUB` requires Redis 7.0+.
- The explanation that `NUMPAT` counts total pattern subscriptions (not clients) is accurate and well-illustrated with the example of one client contributing 3 to the count.
- The performance note about high `NUMPAT` values in the summary is accurate — Redis does match every published message against all active patterns.
- All command syntax shown is correct per current Redis documentation.
