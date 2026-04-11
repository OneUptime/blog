# Validation Summary: How to Monitor Redis Replication Health Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (replication, INFO command, backlog configuration)
- redis-py (Python Redis client library)
- redis-cli (command-line interface)

## Sources Consulted
- redis-py source code (`redis/_parsers/helpers.py` — `parse_info` / `get_value` functions) to verify how `INFO replication` slave entries are returned
- Redis official documentation on replication configuration (`replicaof`, `replica-read-only`, `min-replicas-to-write`, `min-replicas-max-lag`)
- Redis `INFO replication` field reference for both primary and replica output formats

## Issues Found

1. **`check_all_replicas` manual string parsing would crash at runtime.** The code called `.split(',')` on the value returned by `info.get(f'slave{i}')`, treating it as a raw string. However, redis-py's `parse_info` function already parses slave entries (e.g., `slave0:ip=...,port=...,state=...,offset=...,lag=...`) into Python dicts with numeric values converted to ints. Calling `.split()` on a dict raises `AttributeError`. **Fix:** Removed the manual string-parsing lines and accessed the dict directly via `.get()`.

2. **`min-replicas-to-write` and `min-replicas-max-lag` placed under replica config.** These directives control whether the *primary* accepts writes based on the number of connected replicas. They are meaningless on a replica. The post grouped them under "In `redis.conf` on the replica" alongside `replicaof`. **Fix:** Split the configuration block into two: replica-side directives (`replicaof`, `replica-read-only`) and primary-side directives (`min-replicas-to-write`, `min-replicas-max-lag`), each with a clear heading.

## Review Notes
- The `INFO replication` sample outputs are accurate and representative of Redis 7.x output (includes fields like `slave_read_repl_offset`, `replica_announced`, `master_failover_state`).
- The first Python example (`get_replication_lag`) is correct — it only reads top-level info keys (`master_repl_offset`, `slave_repl_offset`, `master_link_status`) which redis-py returns as plain ints/strings.
- Alert thresholds in the metrics tables are reasonable defaults but will vary by workload; the post appropriately frames them as guidance rather than absolutes.
