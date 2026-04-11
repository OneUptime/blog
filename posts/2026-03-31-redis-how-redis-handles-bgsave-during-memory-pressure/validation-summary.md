# Validation Summary: How Redis Handles BGSAVE During Memory Pressure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (BGSAVE, RDB persistence)
- Linux kernel copy-on-write (COW) mechanism
- Linux Transparent Huge Pages (THP)
- Redis replication (WAIT command)

## Sources Consulted
- Redis BGSAVE documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis WAIT command documentation: https://redis.io/docs/latest/commands/wait/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis latency documentation (fork latency): https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly describes all INFO fields (`rdb_bgsave_in_progress`, `rdb_last_bgsave_time_sec`, `used_memory_rss_human`, `latest_fork_usec`, `rdb_last_bgsave_status`, `used_memory_human`, `maxmemory_human`) and CONFIG parameters (`stop-writes-on-bgsave-error`).
- The comparison of `used_memory_rss` vs `used_memory` for detecting COW overhead is valid during BGSAVE, though memory fragmentation can also contribute to the gap. Redis 5+ provides `rdb_last_cow_size` in INFO persistence for more precise COW measurement, which could be mentioned in a future update.
- The WAIT section before BGSAVE is a valid but niche use case. BGSAVE snapshots the master's data regardless of replica state, so WAIT is more about ensuring write durability to replicas than a prerequisite for BGSAVE. The command syntax and explanation are technically correct.
- The 200ms fork time threshold is a reasonable community guideline, though Redis documentation does not specify an exact threshold.
