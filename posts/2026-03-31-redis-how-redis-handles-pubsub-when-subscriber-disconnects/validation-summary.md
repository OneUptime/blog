# Validation Summary: How Redis Handles Pub/Sub When Subscriber Disconnects

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Pub/Sub
- Redis Streams (consumer groups, XADD, XREADGROUP, XACK)
- Redis CLI commands (PUBLISH, PUBSUB, CLIENT LIST)
- Python redis-py client library

## Sources Consulted
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis XREADGROUP documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XGROUP CREATE documentation: https://redis.io/docs/latest/commands/xgroup-create/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis CLIENT LIST documentation: https://redis.io/docs/latest/commands/client-list/

## Issues Found

### 1. Incorrect keyspace events claim for detecting subscriber disconnects
**What was wrong:** The "Detecting Subscriber Disconnect Events" section claimed that Redis emits keyspace events for subscribe/unsubscribe actions using `CONFIG SET notify-keyspace-events "Pg"`. The `P` flag does not exist for `notify-keyspace-events`, and keyspace notifications do not cover Pub/Sub subscription activity at all. Keyspace notifications only track data-structure operations (SET, DEL, EXPIRE, etc.) and key lifecycle events.

**What was changed:** Rewrote the section to accurately state that Redis does not provide built-in event notifications for subscriber disconnects. Replaced the incorrect commands with correct polling-based approaches using `PUBSUB NUMSUB` and `CLIENT LIST TYPE pubsub`, and mentioned application-level heartbeats as an alternative.

### 2. Missing XGROUP CREATE before XREADGROUP
**What was wrong:** The Redis Streams example showed `XREADGROUP GROUP mygroup consumer1 ...` without first creating the consumer group. XREADGROUP requires the consumer group to already exist; without it, Redis returns a `NOGROUP` error.

**What was changed:** Added `redis-cli XGROUP CREATE notifications mygroup 0` between the XADD (producer) and XREADGROUP (consumer) commands, with a comment explaining it is required before reading.

## Review Notes
- The Python reconnection example works correctly but does not show `handle_message()` implementation. This is fine for illustrative purposes.
- The Streams example uses `0` as the starting ID for XGROUP CREATE, meaning the consumer group will read all existing messages in the stream. Depending on use case, `$` (only new messages) might be more appropriate, but either is valid.
- The post could mention Redis 7.0+ sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`) as another option, but this is not an error — just a potential future enhancement.
