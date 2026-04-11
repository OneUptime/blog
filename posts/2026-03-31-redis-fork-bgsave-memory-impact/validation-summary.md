# Validation Summary: How Redis Fork Works During BGSAVE and Its Memory Impact

## Status
validated

## Post Type
Technical Guide / Deep Dive

## Technologies Covered
- Redis (BGSAVE, SAVE, RDB snapshots, AOF rewrite)
- Linux kernel copy-on-write (COW) mechanism
- Linux Transparent Huge Pages (THP)
- Bash scripting (monitoring)
- Cron scheduling

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/management/persistence/
- Redis INFO command documentation: https://redis.io/commands/info/ (stats and persistence sections)
- Redis BGSAVE command documentation: https://redis.io/commands/bgsave/
- Redis SAVE command documentation: https://redis.io/commands/save/
- Linux kernel documentation on Transparent Huge Pages: https://www.kernel.org/doc/Documentation/vm/transhuge.txt
- Redis latency documentation: https://redis.io/docs/management/optimization/latency/

## Issues Found
No technical issues found.

## Review Notes
- The term "global lock" used to describe SAVE's blocking behavior is a slight simplification — Redis is single-threaded and SAVE blocks the event loop rather than holding a traditional lock. The practical meaning is correct: all client requests are blocked for the duration.
- The summary recommends "memory headroom of at least 1.5x your dataset size" while Strategy 2 recommends using only 50-60% of available RAM (implying ~2x total). These are slightly different ratios but both fall within the range of standard Redis deployment guidance.
- Fork latency estimates (e.g., 1-3 ms for 1 GB) are reasonable approximations but will vary significantly depending on hardware, kernel version, and memory fragmentation.
- The `rdb_last_cow_size` field is available since Redis 5.0. Readers using Redis 4.x or earlier will not have this metric.
- All byte calculations in the examples are mathematically correct (50 MB, 500 MB, 8 MB, 1 GB).
