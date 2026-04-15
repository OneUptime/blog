# Validation Summary: How to Troubleshoot ClickHouse Keeper Connection Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper (Raft-based ZooKeeper alternative)
- systemd / journalctl
- netcat (nc) for four-letter word commands
- clickhouse-keeper-client
- iptables / firewalld

## Sources Consulted
- ClickHouse source code: `src/Storages/System/StorageSystemZooKeeperConnection.cpp` for `system.zookeeper_connection` table schema
- ClickHouse Keeper documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper (four-letter word commands)
- clickhouse-keeper-client utility documentation: https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client
- ClickHouse system tables documentation for `system.replicas` and `system.zookeeper_connection`

## Issues Found

### 1. Non-existent `connected` column in `system.zookeeper_connection`
**What was wrong:** The post listed `connected: should be 1` as a field to check in the `system.zookeeper_connection` table. This column does not exist. The actual columns for checking connection health are `is_expired` (UInt8) and `connected_time` (DateTime).
**What was changed:** Replaced the `connected` bullet with `connected_time` (shows when the connection was established) and reordered to lead with `is_expired` as the primary health indicator.

### 2. Invalid `ls` command via netcat
**What was wrong:** The post suggested `echo ls / | nc keeper1 9181` to list znodes. `ls` is not a four-letter word (4lw) command supported by ClickHouse Keeper. The 4lw protocol only accepts specific four-character commands (ruok, stat, mntr, etc.), not interactive ZooKeeper-style commands like `ls`.
**What was changed:** Replaced with `clickhouse-keeper-client -h keeper1 -p 9181 -q "ls '/'"`, which is the correct CLI tool for browsing Keeper znodes.

## Review Notes
- The `ruok`, `stat`, and other four-letter commands used elsewhere in the post are all correct and part of the default Keeper whitelist.
- The `coordination_settings` and `zookeeper` XML configuration blocks use correct element names and are valid for ClickHouse Keeper and ClickHouse server respectively.
- `SYSTEM RESTART REPLICA` syntax is correct for recovering replicated tables after Keeper restoration.
- The Raft quorum explanation is accurate for odd-numbered Keeper clusters, which is the standard deployment pattern.
