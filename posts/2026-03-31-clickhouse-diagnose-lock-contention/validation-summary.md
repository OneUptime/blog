# Validation Summary: How to Diagnose ClickHouse Lock Contention

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- ClickHouse (system tables, ProfileEvents, mutations, RWLocks)
- ZooKeeper / ClickHouse Keeper (replication coordination)
- SQL (ClickHouse dialect)

## Sources Consulted
- [ClickHouse system tables overview](https://clickhouse.com/docs/en/operations/system-tables)
- [system.metrics documentation](https://clickhouse.com/docs/en/operations/system-tables/metrics)
- [system.events documentation](https://clickhouse.com/docs/operations/system-tables/events)
- [ClickHouse ProfileEvents.cpp source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp)
- [ClickHouse CurrentMetrics.cpp source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp)
- [Tinybird article on ClickHouse lock contention](https://www.tinybird.co/blog/clickhouse-lock-contention)
- [ChistaData: ClickHouse wait events](https://chistadata.com/understanding-clickhouse-wait-events/)

## Issues Found

1. **Non-existent system table `system.rwlock_events`** — The original Step 2 referenced `SELECT * FROM system.rwlock_events`. This system table does not exist in ClickHouse (verified against the official system tables index and ClickHouse source). Replaced with a valid query against `system.metrics` filtering for the documented `RWLockWaitingReaders`, `RWLockWaitingWriters`, `RWLockActiveReaders`, and `RWLockActiveWriters` metrics, which are the canonical way to inspect live RWLock state.

2. **Incorrect location for `ZooKeeperWaitMicroseconds`** — The original ZooKeeper section claimed `ZooKeeperWaitMicroseconds` could be found via the `system.metrics` query. `ZooKeeperWaitMicroseconds` is actually a cumulative `ProfileEvent` exposed in `system.events` (and `system.query_log` ProfileEvents), not a current-value metric in `system.metrics`. Updated the section to query `system.metrics` for current ZooKeeper/Keeper state metrics (e.g., `ZooKeeperRequest`, `ZooKeeperSession`, `ZooKeeperWatch`) and added a separate query against `system.events` for the cumulative `ZooKeeperWaitMicroseconds` value.

3. Tightened the `system.metrics` LIKE filter from `'%Zookeeper%' OR '%ZK%'` to `'%ZooKeeper%' OR '%Keeper%'` to match the actual metric naming in ClickHouse (the source uses `ZooKeeper...` and `Keeper...` prefixes; there are no `ZK`-prefixed metrics).

## Review Notes

- The `RWLockAcquiredReadLocks`, `RWLockAcquiredWriteLocks`, `RWLockReadersWaitMilliseconds`, and `RWLockWritersWaitMilliseconds` ProfileEvent names used in Step 1 are correct and current per ClickHouse `ProfileEvents.cpp`.
- The `system.processes`, `system.mutations`, and `KILL MUTATION` syntax are correct.
- The conceptual description of ClickHouse locking (table RW locks, part locks, ZooKeeper coordination, mutex serialization) is accurate.
- Future improvement: the post could mention that `lock_acquire_timeout` is the relevant setting controlling how long a query waits for a table lock before throwing `DEADLOCK_AVOIDED`.
