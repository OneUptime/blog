# Validation Summary: How Redis Sentinel Works for High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Sentinel
- Redis (primary/replica replication)
- ioredis (Node.js client library)
- Jedis (Java client library, mentioned)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis SENTINEL commands reference: https://redis.io/docs/latest/commands/?group=sentinel
- ioredis Sentinel documentation: https://github.com/redis/ioredis#sentinel

## Issues Found
- **Misleading parenthetical about PING interval configurability**: The original text read "Each Sentinel sends PING commands to monitored Redis instances every second (configurable with sentinel down-after-milliseconds)." The parenthetical implied that the PING frequency is configurable via `down-after-milliseconds`, but the PING interval is fixed at 1 second. The `down-after-milliseconds` directive configures the timeout threshold for declaring SDOWN, not the PING frequency. Rewrote the sentence to correctly associate `down-after-milliseconds` with the timeout rather than the PING interval.

## Review Notes
- The ioredis example uses different ports for each Sentinel (26379, 26380, 26381) on different hosts. While not incorrect, the default Sentinel port is 26379 and most multi-host deployments use the same port on each host. This is a stylistic choice, not an error.
- The `SENTINEL replicas` command used in the monitoring section is the modern form (Redis 5.0+). The older `SENTINEL slaves` command is not mentioned but is not needed since Redis 5.0+ is the current standard.
- The post uses `REPLICAOF NO ONE` (Redis 5.0+ syntax) rather than the deprecated `SLAVEOF NO ONE`, which is appropriate.
- The `replica-priority` config directive was renamed from `slave-priority` in Redis 5.0. The post correctly uses the modern name.
