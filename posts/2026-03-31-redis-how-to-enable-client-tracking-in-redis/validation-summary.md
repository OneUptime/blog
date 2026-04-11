# Validation Summary: How to Enable CLIENT TRACKING in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 6.0+ (CLIENT TRACKING, client-side caching)
- Redis RESP2 and RESP3 protocols
- Python (redis-py client library)
- Redis Pub/Sub (for invalidation delivery in RESP2 mode)

## Sources Consulted
- Redis CLIENT TRACKING documentation: https://redis.io/docs/latest/commands/client-tracking/
- Redis CLIENT INFO documentation: https://redis.io/docs/latest/commands/client-info/
- Redis CLIENT LIST documentation: https://redis.io/docs/latest/commands/client-list/
- Redis CLIENT CACHING documentation: https://redis.io/docs/latest/commands/client-caching/
- Redis CLIENT NO-TOUCH documentation: https://redis.io/docs/latest/commands/client-no-touch/
- Redis CLIENT NO-EVICT documentation: https://redis.io/docs/latest/commands/client-no-evict/

## Issues Found

1. **Step 1 - SUBSCRIBE before CLIENT ID (ordering error)**: The original had `SUBSCRIBE __redis__:invalidate` before `CLIENT ID`. Once a connection enters subscriber mode via SUBSCRIBE, it cannot execute non-Pub/Sub commands like CLIENT ID. Fixed by moving CLIENT ID before SUBSCRIBE.

2. **CLIENT INFO output - fabricated fields**: The example showed `flags=N` (normal client, no tracking) alongside `tracking=on tracking-bcast-ttl=0 tracking-keys=15`. The fields `tracking=on`, `tracking-bcast-ttl`, and `tracking-keys` do not exist in Redis CLIENT INFO output. Fixed to show `flags=t` (tracking enabled) and `redir=10` (redirect target client ID), which are the actual tracking-related fields documented by Redis.

3. **CLIENT NO-TOUCH - wrong syntax and description**: The original had `CLIENT NO-TOUCH` (missing required ON/OFF argument) with comment "Read key without tracking it." CLIENT NO-TOUCH is not related to client tracking at all — it prevents the client from updating LRU/LFU idle time counters on key access (added in Redis 7.2). Fixed syntax to `CLIENT NO-TOUCH ON` and corrected the comment.

4. **CLIENT NO-EVICT ON - misleading comment**: The original said "Prevent this client's tracking from being evicted." CLIENT NO-EVICT ON prevents the client connection itself from being evicted under memory pressure (maxmemory-clients), not specifically tracking data. Fixed the comment to be accurate.

5. **Verify section - separate redis-cli calls create separate connections**: The original used `redis-cli CLIENT TRACKING ON REDIRECT <id>` and `redis-cli GET mykey` as separate shell commands. Each `redis-cli` invocation creates a new connection, so tracking enabled on the first connection is lost for the second. Fixed to use interactive `redis-cli` sessions for both the subscriber and data connections, and corrected the subscriber terminal to run CLIENT ID before SUBSCRIBE.

## Review Notes
- The RESP3 section includes an empty code snippet with just `import socket` and `import ssl` that serves as a placeholder. Not technically wrong but not useful either.
- The post does not mention the `NOLOOP` option for CLIENT TRACKING, which prevents invalidation notifications for keys modified by the same client. This is a useful option worth mentioning in a future update.
- The `flags` field description was expanded to note `t` = tracking on and `B` = broadcast mode, which helps readers interpret the CLIENT INFO output.
- CLIENT NO-TOUCH (Redis 7.2+) and CLIENT NO-EVICT (Redis 7.0+) are presented alongside Redis 6.0+ tracking features without noting the version differences. Version annotations were added to the inline comments.
