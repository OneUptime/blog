# Validation Summary: How to Use system.replicas Table in ClickHouse

## Status
validated

## Post Type
Reference / Monitoring Guide

## Technologies Covered
- ClickHouse
- system.replicas system table
- ReplicatedMergeTree engine
- ZooKeeper / ClickHouse Keeper
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: system.replicas table — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation: Replication — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found

1. **Incorrect claim about leader exclusivity (line 91):** The post stated "Only one replica per shard is the leader at any time." The official ClickHouse documentation explicitly states that multiple replicas can be leaders simultaneously. Fixed to: "One or more replicas per shard can be leaders at the same time. Leaders are responsible for scheduling background merges."

2. **Inaccurate description of `absolute_delay` (line 25):** The post described `absolute_delay` as "seconds this replica lags behind the leader." The official documentation describes it more neutrally as "How big lag in seconds the current replica has" without attributing the lag reference to the leader specifically. Fixed to: "how far behind in seconds the current replica is."

## Review Notes
- All column names referenced in the post (`database`, `table`, `engine`, `is_leader`, `is_readonly`, `is_session_expired`, `queue_size`, `inserts_in_queue`, `merges_in_queue`, `absolute_delay`, `total_replicas`, `active_replicas`, `replica_name`, `zookeeper_path`, `replica_path`, `last_queue_update_exception`) are verified to exist in the official documentation.
- All SQL queries use valid ClickHouse syntax, including UInt8 boolean comparisons with `= 1`, computed columns with `AS`, and standard `ORDER BY` / `LIMIT` clauses.
- The `is_leader` column is not deprecated as of current ClickHouse versions.
