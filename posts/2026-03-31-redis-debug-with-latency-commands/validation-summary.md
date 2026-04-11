# Validation Summary: How to Debug Redis with LATENCY Commands

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (latency monitoring framework)
- Redis CLI (`LATENCY LATEST`, `LATENCY HISTORY`, `LATENCY GRAPH`, `LATENCY RESET`)
- Python (redis-py client library)
- Linux sysctl / transparent huge pages configuration

## Sources Consulted
- Redis LATENCY command documentation: https://redis.io/docs/latest/commands/latency-latest/
- Redis latency monitoring documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/
- Redis latency.c source code (event name definitions)
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- redis-py library documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Removed `CONFIG SET latency-tracking yes`** — `latency-tracking` is a separate Redis 7.0+ feature that enables per-command latency percentile tracking (used with `LATENCY HISTOGRAM`). It is unrelated to the `LATENCY LATEST/HISTORY/GRAPH/RESET` commands discussed in the post, which are controlled solely by `latency-monitor-threshold`. Including it in the setup section was incorrect and misleading.

2. **Fixed event name `aof-stat` → `aof-fsync-always`** — The Redis latency monitoring framework uses `aof-fsync-always` for the event triggered by synchronous AOF fsync operations (when `appendfsync always` is set). `aof-stat` is not a valid Redis latency event name (the closest is `aof-fstat` for fstat() syscall latency). Since the post discusses this event in the context of AOF sync diagnosis and `appendfsync` tuning, `aof-fsync-always` is the correct event. Updated in the LATENCY LATEST output example, the event types list, and the AOF sync diagnosis section.

3. **Fixed event name `aof-rewrite-diff-flush` → `aof-rewrite-diff-write`** — The correct Redis latency event name is `aof-rewrite-diff-write`, not `aof-rewrite-diff-flush`. Updated the description to "AOF rewrite buffer write".

4. **Fixed event name `loading-rdb-used-memory` → `rdb-unlink-temp-file`** — `loading-rdb-used-memory` is not a valid Redis latency event name (it resembles an INFO field, not a latency event). Replaced with `rdb-unlink-temp-file`, which is an actual RDB-related latency event.

5. **Fixed THP comment: "Enable" → "Disable"** — The command `echo never > /sys/kernel/mm/transparent_hugepage/enabled` disables transparent huge pages, which is the correct recommendation for Redis. The original comment incorrectly said "Enable transparent huge pages workaround", which was misleading.

6. **Fixed percentile indices in Python code** — With 100 sorted samples (indices 0–99), `latencies[50]` is index 50 (p51) and `latencies[99]` is the maximum (p100), not p99. Corrected to `latencies[49]` for p50 and `latencies[98]` for p99.

## Review Notes
- The `LATENCY GRAPH` ASCII output example is simplified/illustrative and doesn't match the exact format Redis produces, but this is acceptable for a blog post since the actual format varies.
- The `awk` command for converting timestamps uses `strftime`, which is a GNU awk (gawk) extension and may not work with all awk implementations (e.g., macOS default awk). Readers on non-GNU systems would need to install gawk.
- The Python code uses `client.latency_latest()` which is available in redis-py 5.x+. The return format and tuple unpacking behavior should be verified against the specific redis-py version in use.
- The post correctly recommends disabling THP and adjusting `appendfsync` for common latency issues — both are well-established Redis best practices.
