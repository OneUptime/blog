# Validation Summary: How to Diagnose ClickHouse ZooKeeper Communication Failures

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- ClickHouse (replicated tables, system tables)
- Apache ZooKeeper
- ClickHouse Keeper
- SQL (ClickHouse dialect)
- Bash / `nc` / ZooKeeper 4-letter word commands

## Sources Consulted
- ClickHouse `system.metrics` documentation — https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse `system.events` documentation — https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse `system.zookeeper` documentation — https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse `system.zookeeper_connection` documentation — https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection
- ClickHouse `system.replication_queue` documentation — https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse `system.replicas` documentation — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `ProfileEvents.cpp` source — https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- Apache ZooKeeper admin guide (4lw commands) — https://zookeeper.apache.org/doc/r3.5.7/zookeeperAdmin.html

## Issues Found

1. **Non-existent ProfileEvent `ZooKeeperExceptions`** (Step 2). The ClickHouse source defines `ZooKeeperUserExceptions`, `ZooKeeperHardwareExceptions`, and `ZooKeeperOtherExceptions`, but not a single consolidated `ZooKeeperExceptions` counter. Replaced the bullet list with the three real counter names and short descriptions.

2. **Fabricated `system.zookeeper` columns** (Step 4). The original query selected `zoo_host, zookeeper_path, is_leader, last_zxid, connections` — none of these are columns in `system.zookeeper`. The real columns are `name, path, value, zookeeperName, dataLength, numChildren, czxid, mzxid, pzxid, ctime, mtime, version, cversion, aversion, ephemeralOwner`, and the table requires a `path =` or `path IN` filter. Rewrote the step to use `system.zookeeper_connection` (which actually exposes session/connection state with real columns: `name, host, port, connected_time, session_uptime_elapsed_seconds, is_expired, last_zxid_seen`) plus a corrected `system.zookeeper` query with valid columns and the mandatory `path =` filter.

## Review Notes
- The `mntr` 4-letter word command is correct, but since ZooKeeper 3.5.3 it must be listed in `4lw.commands.whitelist` in `zoo.cfg`. It is included in the default allowlist on recent builds, but hardened deployments may need to enable it explicitly. Not a blocker for the post as written.
- `ZooKeeperSession`, `ZooKeeperRequest`, `ZooKeeperWatch` metrics in Step 1 are all valid `system.metrics` gauges. `ZooKeeperSessionExpired` and `ZooKeeperConnectionLossStartedTimestampSeconds` could be added as additional useful signals in a future revision.
- All columns referenced in the `system.replication_queue` and `system.replicas` queries were verified against the official docs and are correct.
- `SYSTEM SYNC REPLICA events` syntax is correct; it assumes a table named `events` exists, which the reader is expected to substitute.
