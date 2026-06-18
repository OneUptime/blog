# Validation Summary: How to Tune Redis for High Write Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Open Source
- Redis persistence: RDB and AOF
- Redis memory management and eviction
- Redis active defragmentation
- redis-py
- redis-benchmark
- Linux kernel TCP and memory settings

## Sources Consulted
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis 8.0 redis.conf reference: https://raw.githubusercontent.com/redis/redis/8.0/redis.conf
- Redis 7.2 redis.conf reference: https://raw.githubusercontent.com/redis/redis/7.2/redis.conf
- Redis benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- Redis redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- redis-py connection documentation: https://redis.readthedocs.io/en/stable/connections.html

## Issues Found
- The introduction claimed Redis defaults prioritize data safety over raw performance. Current Redis defaults use RDB snapshotting and leave AOF disabled, so the statement was too broad. Updated it to say defaults balance durability, safety, and performance rather than optimize for raw write throughput.
- The default RDB save point examples were stale. Redis 7.2 and Redis 8.0 sample configs document `save 3600 1 300 100 60 10000`, not `save 900 1`, `save 300 10`, and `save 60 10000`. Updated the snippet and comments.
- The active defragmentation comment said `active-defrag-threshold-upper 100` stops defrag below 5% fragmentation. Redis documents this setting as the fragmentation percentage where maximum defrag effort is used. Updated the comment.
- The connection pooling Python example used `time.time()` but did not import `time` in that standalone snippet. Added `import time`.

## Review Notes
- The Redis configuration examples intentionally trade durability and security for throughput. In particular, `appendfsync no`, `bind 0.0.0.0`, and broad eviction settings should be adapted before production use.
- `redis-benchmark` throughput numbers are hardware, payload, connection-count, persistence, and pipeline-size dependent. The commands and flags are valid, but the example results should be treated as illustrative.
- Active defragmentation requires a Redis build using jemalloc and should be enabled when fragmentation warrants it, not blindly for every workload.
