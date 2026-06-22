# Validation Summary: How to Configure Redis AOF (Append-Only File)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis AOF persistence
- Redis configuration
- Redis CLI
- redis-check-aof
- redis-py
- ioredis
- Prometheus and Grafana monitoring

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis official redis.conf reference source: https://github.com/redis/redis/blob/unstable/redis.conf
- Redis redis-check-aof source usage: https://github.com/redis/redis/blob/unstable/src/redis-check-aof.c
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- ioredis guide: https://redis.io/docs/latest/develop/clients/ioredis/
- Redis Exporter project: https://github.com/oliver006/redis_exporter

## Issues Found
- Clarified AOF wording for Redis 7 multi-part AOF. The post described AOF as a single log file and described all AOF files as human-readable Redis commands. Redis 7 stores AOF data as multiple files in `appenddirname`, and base files can be RDB-formatted, so the wording now refers to AOF data and incremental AOF entries.
- Corrected `appendfsync always` durability wording. Redis fsyncs appended command batches before replies, so "lose at most one command" was too specific and inaccurate for pipelined or batched writes.
- Corrected `appendfsync no` data-loss wording. Official Redis docs note flushing depends on OS behavior and can be around 30 seconds on Linux with default tuning.
- Fixed Redis 7 AOF configuration wording. `aof-use-rdb-preamble yes` configures rewritten base files to use RDB format; it does not enable multi-part AOF. Added `appenddirname "appendonlydir"` to match the Redis 7 multi-part structure.
- Fixed `redis-check-aof` examples. Checking should be done without `--fix`, and Redis 7 multi-part AOF should be checked through the manifest file. The repair description now notes that invalid portions may be discarded from the first unrecoverable error onward.
- Corrected the `aof-rewrite-incremental-fsync` explanation. It fsyncs the rewritten AOF incrementally every 4 MB, not a maximum rewrite buffer size.
- Corrected PromQL examples. `redis_aof_last_rewrite_time_sec` is a last-duration gauge, so `rate()` was inappropriate, and `redis_aof_pending_bio_fsync` measures pending background fsync jobs rather than commands since last fsync.
- Improved RDB-to-AOF switch verification. The wait command now checks `aof_rewrite_in_progress`, `aof_rewrite_scheduled`, and `aof_last_bgrewrite_status`, matching Redis guidance.
- Corrected rewrite scheduling advice. Automatic rewrite thresholds are size-based, not time-based, so the best-practice wording now recommends manual rewrites during low traffic and threshold tuning.

## Review Notes
The Python and Node.js examples are syntactically valid and use supported redis-py and ioredis patterns. The Node.js example uses ioredis, which Redis still supports, but Redis documentation recommends node-redis for new projects.
