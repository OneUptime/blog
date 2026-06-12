# Validation Summary: How to Configure Redis Persistence (RDB vs AOF)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis persistence
- RDB snapshots
- AOF logging
- Redis hybrid persistence
- Redis CLI commands
- Redis configuration
- Shell backup and recovery scripts
- Prometheus Redis exporter metrics

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis 7.4 sample redis.conf: https://raw.githubusercontent.com/redis/redis/7.4/redis.conf
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis SAVE command documentation: https://redis.io/docs/latest/commands/save/
- redis_exporter source mapping for persistence metrics: https://github.com/oliver006/redis_exporter

## Issues Found
- The AOF examples assumed a single `appendonly.aof` file. Redis 7+ uses multi-part AOF files under `appenddirname`, with a manifest. Added `appenddirname`, Redis 7+ `redis-check-aof` guidance, and Redis 7+ backup/restore examples.
- The hybrid persistence description only matched Redis 4-6 single-file AOF behavior. Updated it to distinguish Redis 4-6 RDB preamble behavior from Redis 7+ multi-part AOF base/increment files.
- The backup script's `LASTSAVE` wait loop compared two fresh `LASTSAVE` calls, which could loop indefinitely. Changed it to record the timestamp before `BGSAVE` and wait until `LASTSAVE` advances.
- The Redis 7+ AOF backup example copied the AOF directory without guarding against concurrent AOF rewrite. Added temporary disabling of automatic AOF rewrites and a wait for `aof_rewrite_in_progress` to become `0` before archiving the directory.
- The AOF restore procedure only covered Redis 6 and earlier. Added a separate Redis 7+ multi-part AOF restore procedure using the AOF directory and manifest.
- The durability table claimed `appendfsync always` has no data loss. Changed this to "Lowest loss risk" because fsync-after-every-write reduces risk but is not an absolute guarantee across all operating system, disk, and failure modes.

## Review Notes
The Redis `INFO persistence` fields and the redis_exporter Prometheus metric names used in the post are valid for the checked sources. Metric names can still vary with a different exporter or managed Redis product, so future posts should name the exporter when presenting PromQL alerts.
