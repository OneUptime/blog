# Validation Summary: How to Configure Redis for Maximum Durability

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (AOF persistence, RDB snapshots, replication)
- Linux kernel settings (vm.overcommit_memory, transparent huge pages, swap)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/management/persistence/
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on configuration directives: https://redis.io/docs/management/config/
- Redis official documentation on latency: https://redis.io/docs/management/optimization/latency/
- Linux kernel documentation on vm.overcommit_memory

## Issues Found
1. **Incorrect comment for `vm.overcommit_memory=1`**: The bash comment said "Ensure the OS flushes write buffers reliably" but `vm.overcommit_memory=1` has nothing to do with write buffer flushing. It tells the Linux kernel to always allow memory overcommit, which prevents `fork()` failures when Redis performs background saves (BGSAVE or AOF rewrite). Changed the comment to "Allow memory overcommit to prevent fork failures during background saves."

## Review Notes
- The description of `min-replicas-to-write` uses the common simplification that replicas "acknowledge" writes. In reality, replicas periodically report their replication offset via `REPLCONF ACK`, and the primary checks that at least N replicas have reported within `min-replicas-max-lag` seconds. This is not per-write synchronous acknowledgment, but the simplification is standard in Redis tutorials and not misleading for the target audience.
- All Redis configuration directives (`appendonly`, `appendfsync`, `no-appendfsync-on-rewrite`, `save`, `aof-use-rdb-preamble`, `min-replicas-to-write`, `min-replicas-max-lag`, `rdbcompression`, `rdbchecksum`, `stop-writes-on-bgsave-error`, `aof-rewrite-incremental-fsync`) are valid and correctly named.
- All `redis-cli` commands use correct syntax and valid subcommands.
- The throughput estimate of 2,000-5,000 writes/second with `appendfsync always` is reasonable for typical SSD hardware.
- System-level recommendations (disable THP, disable swap, set overcommit) align with official Redis production recommendations.
