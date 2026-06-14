# Validation Summary: How to Set Up Automatic Failover with Redis Sentinel

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis Open Source
- Redis Sentinel
- Redis replication
- Docker Compose
- redis-cli
- Node.js
- ioredis
- Bash notification scripts

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- ioredis Sentinel documentation: https://github.com/redis/ioredis#sentinel
- Redis Sentinel example configuration: https://github.com/redis/redis/blob/unstable/sentinel.conf
- Docker Redis image filesystem check for `redis:7.2-alpine`

## Issues Found
- Sentinel authentication was used by the ioredis client through `sentinelPassword`, but the Sentinel configuration did not require Sentinel client authentication. Added `requirepass your-sentinel-password` to the Sentinel config and changed the ioredis `sentinelPassword` to use that Sentinel password rather than the Redis data-node password.
- The Docker Compose example used container IP addresses, but the earlier Redis and Sentinel config snippets used `192.168.1.10` and host-style directories/log paths. Added Docker-specific guidance to use `172.20.0.10`, `dir /data`, and stdout logging for the Redis Alpine containers.
- The monitoring and failover test commands queried Sentinel without authenticating after Sentinel auth was enabled. Updated the `redis-cli` examples to pass the Sentinel password.
- The failover test script piped normal RESP-formatted `redis-cli` output into `grep` patterns that expected raw field names. Updated those commands to use `redis-cli --raw`.
- The Node.js example listened for `+switch-master` on the data Redis connection. Sentinel switch events are Sentinel Pub/Sub messages, so the example now creates a Sentinel connection, subscribes to `+switch-master`, and parses the event message.
- The notification script expected six positional arguments, but Redis Sentinel notification scripts are called with only two arguments: event type and event description. Updated the script to use `$1` and `$2`, and to parse the `+switch-master` description only for that event.

## Review Notes
Redis Sentinel with Redis asynchronous replication can still lose acknowledged writes during some failures; the post's use of `min-replicas-to-write` and `min-replicas-max-lag` narrows that window but does not make writes fully synchronous. The Docker Compose file is suitable for local testing, but production deployments should place Redis and Sentinel processes on independently failing hosts or availability zones.
