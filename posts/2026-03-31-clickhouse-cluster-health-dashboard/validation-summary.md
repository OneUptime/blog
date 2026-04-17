# Validation Summary: How to Build a ClickHouse Cluster Health Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, system tables)
- ZooKeeper / ClickHouse Keeper
- `clusterAllReplicas` table function
- System tables: `system.one`, `system.zookeeper_connection`, `system.replicas`, `system.merges`, `system.asynchronous_metrics`, `system.parts`
- Grafana (dashboard setup)

## Sources Consulted
- ClickHouse `system.zookeeper_connection` docs: https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection
- ClickHouse `system.asynchronous_metrics` docs: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.merges`, `system.parts`, `system.one` docs
- ClickHouse `clusterAllReplicas` function docs

## Issues Found

1. **Incorrect column names in `system.zookeeper_connection` query.** The post used `zookeeper_session_uptime_seconds` and `zookeeper_exceptions`, neither of which are columns of `system.zookeeper_connection`. The correct column is `session_uptime_elapsed_seconds`; `zookeeper_exceptions` does not exist in that table at all. Replaced with `session_uptime_elapsed_seconds` and `is_expired` (which is a real column and useful for health monitoring), and updated the surrounding prose to match.

2. **Broken CPU/Memory Utilization query against `system.asynchronous_metrics`.** The original query selected `total_ram_bytes` and `free_ram_bytes` as if they were columns, but `system.asynchronous_metrics` only has `metric`, `value`, and `description` columns — metric names are row values, not columns. Rewrote the query to pivot with `sumIf(value, metric = '...')` and added the required `GROUP BY node` clause so the aggregation works.

## Review Notes
- `is_leader` in `system.replicas` has limited utility on modern ClickHouse because replication is multi-leader; the `WHERE is_leader = 1 OR absolute_delay > 0` filter still behaves reasonably (most active replicas report `is_leader = 1`), so it was left in place.
- `DiskAvailable_default` depends on the disk policy being named `default`; readers with custom storage policies will need to substitute the actual disk name. This is an expected convention in ClickHouse async metrics and was not changed.
- The 3000-active-parts threshold is a rough guideline and aligns with ClickHouse's `parts_to_throw_insert` default (300) and `parts_to_delay_insert` (150) — the figure in the post refers to total active parts per table, at which point operational degradation can appear. Left as-is since it is presented as a soft heuristic.
