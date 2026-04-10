# Validation Summary: How to Configure parallel-syncs in Redis Sentinel

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis Sentinel
- Redis replication (full and partial resync)
- Redis CLI

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis PSYNC command documentation: https://redis.io/docs/latest/commands/psync/
- Example sentinel.conf: https://download.redis.io/redis-stable/sentinel.conf
- Redis redis.conf reference: https://github.com/redis/redis/blob/unstable/redis.conf

## Issues Found

1. **Replicas described as "unavailable for reads" during resync (line 19):** The post stated replicas are unavailable for reads during resync. This is an oversimplification. With the default `replica-serve-stale-data yes`, replicas continue serving stale data during most of the resync process. They only truly block incoming connections during the brief phase when loading the new RDB dataset into memory. Fixed step 3 to clarify this distinction.

2. **"replicas reconnect in milliseconds" claim (line 96):** The post claimed partial resync completes "in milliseconds." This is not backed by official Redis documentation and the actual time depends on network latency and the volume of missed commands. Replaced with a more accurate description: "only the missed commands are transferred rather than a full dataset."

## Review Notes
- All configuration syntax, CLI commands, and runtime modification commands are correct and match official Redis documentation.
- The `SENTINEL replicas` command requires Redis >= 5.0 (it replaced the older `SENTINEL SLAVES` command). The post does not mention this version requirement, which is acceptable since Redis 5.0+ is standard at this point.
- The `repl-backlog-size` math (67108864 = 64MB) is correct.
- The default value of `parallel-syncs` being 1 is confirmed by the example sentinel.conf shipped with Redis.
