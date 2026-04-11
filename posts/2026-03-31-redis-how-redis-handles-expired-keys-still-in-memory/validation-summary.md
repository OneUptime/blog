# Validation Summary: How Redis Handles Expired Keys That Are Still in Memory

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (key expiration, lazy expiration, active expiration, memory management)
- Redis CLI commands (SET, GET, TTL, PTTL, CONFIG, INFO, SUBSCRIBE)
- Redis keyspace notifications

## Sources Consulted
- Redis official documentation on key expiration: https://redis.io/docs/latest/develop/use/keyspace/
- Redis official documentation on CONFIG parameters (hz): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis official documentation on INFO command (stats and keyspace sections): https://redis.io/docs/latest/commands/info/
- Redis official documentation on keyspace notifications: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis official documentation on replication and expiration: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

## Issues Found

1. **Invalid INFO stats field name**: The post used `expires_per_second` in a grep filter on `INFO stats` output. This is not a valid Redis INFO stats field. Changed to `expired_stale_perc`, which is the actual field tracking the percentage of keys probably expired (available since Redis 4.0).

2. **Incorrect replica expiration behavior**: The post stated that replicas "may serve stale expired data briefly." This was true for Redis < 3.2 but is incorrect for all modern Redis versions. Since Redis 3.2, replicas perform a logical expiration check and return nil for expired keys even before the primary sends the DEL command. The keys remain in memory on the replica until the DEL arrives, but they are not served to clients. Updated the explanation and the code comment to reflect this behavior.

## Review Notes
- The active expiration algorithm description (20 random keys sampled, repeat if >25% expired) is accurate and matches the official Redis documentation.
- The `hz` default of 10 and the recommendation to stay below 100 are correct. The post could mention the `dynamic-hz` config (default yes since Redis 5.0) that adaptively adjusts the effective hz, but this is not an error — just a potential enhancement.
- The keyspace notifications configuration (`Ex` flags and `__keyevent@0__:expired` channel) is correct.
