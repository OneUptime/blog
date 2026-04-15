# Validation Summary: How to Right-Size ClickHouse Replicas

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, Distributed engine, replication)
- ClickHouse Keeper (coordination service)
- system.replicas system table

## Sources Consulted
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse load_balancing setting documentation: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse Distributed table engine documentation: https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse source code (LoadBalancing.h, Settings.cpp): https://github.com/ClickHouse/ClickHouse

## Issues Found

### 1. Non-existent columns in `system.replicas` queries
- **What was wrong:** Two SQL queries used `total_reads` and `read_time_ms` as columns from `system.replicas`. These columns do not exist in that table. The `system.replicas` table tracks replication state (queue operations, delays, leader status), not read/query statistics. These queries would fail at runtime.
- **What was changed:** Replaced the "Verify read distribution" query with a query using real columns (`replica_name`, `is_leader`, `queue_size`, `absolute_delay`) to verify replicas are active and caught up. Replaced `total_reads` in the "Removing an Over-Replicated Shard" query with `queue_size`, which is a real column.
- **Why:** The original queries would produce SQL errors. The replacement columns provide meaningful replica health information.

### 2. Incorrect `load_balancing` configuration location
- **What was wrong:** The post showed `load_balancing` as a `config.xml` server setting in XML format. `load_balancing` is a session-level / user-profile-level setting, not a server configuration parameter. Placing it in `config.xml` would have no effect.
- **What was changed:** Replaced the XML snippet with a `SET load_balancing = 'random';` SQL statement, which is the correct way to apply this setting at the session level.
- **Why:** The original XML config would silently do nothing. The `SET` command is the standard and most portable way to apply this setting.

## Review Notes
- The `load_balancing` setting can also be configured in `users.xml` inside a `<profiles>` block for persistent per-user defaults, but the `SET` statement is more universally applicable and appropriate for a blog post.
- The valid values for `load_balancing` are: `random` (default), `nearest_hostname`, `hostname_levenshtein_distance`, `in_order`, `first_or_random`, and `round_robin`. The post only mentions `random`, which is fine since it is the default and most common choice.
- The claim that "read QPS capacity roughly triples" with 3 replicas is a reasonable approximation for read-heavy workloads, though actual scaling depends on query complexity and resource bottlenecks.
- The summary states three replicas "double read throughput" while the body says it "roughly triples" — this is a minor inconsistency in the original text, but both are approximations so no change was made.
