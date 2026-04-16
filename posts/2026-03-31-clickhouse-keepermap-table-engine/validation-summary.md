# Validation Summary: How to Use KeeperMap Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse KeeperMap table engine
- ClickHouse Keeper / ZooKeeper
- SQL (ClickHouse dialect)
- `system.zookeeper` system table

## Sources Consulted
- Official ClickHouse docs — KeeperMap engine: https://clickhouse.com/docs/engines/table-engines/special/keepermap
- Official ClickHouse docs — ClickHouse Keeper: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- Official ClickHouse docs — `system.zookeeper`: https://clickhouse.com/docs/operations/system-tables/zookeeper
- ClickHouse docs — `ALTER TABLE UPDATE`: https://clickhouse.com/docs/sql-reference/statements/alter/update

## Issues Found

1. **Incorrect claim that UPDATE is unsupported.** The post stated: "KeeperMap supports INSERT, SELECT, and DELETE but not UPDATE. To change a value, you delete and re-insert." This is wrong — KeeperMap supports `ALTER TABLE ... UPDATE` on non-primary-key columns, and INSERT on an existing primary key already performs an upsert (overwrites) by default. Rewrote the paragraph to describe the correct upsert behavior, mentioned `keeper_map_strict_mode` for the strict variant, and replaced the DELETE+INSERT example with an INSERT-overwrite and `ALTER TABLE UPDATE` example.

2. **"No aggregations" limitation was misleading.** The post claimed complex analytics queries "are not supported." They are supported — just inefficient, because any query that is not a primary-key equality/IN lookup falls back to a full scan. Rewrote the bullet to say "Inefficient for analytics" and describe the full-scan fallback, which matches the official engine behavior.

3. **Primary key bullet tightened.** Added the documented constraint that the PRIMARY KEY must be exactly one column (serialized as the ZNode name), since this is a real limitation worth knowing when designing a schema.

## Review Notes
- The engine syntax `KeeperMap(root_path)` is valid, but there is an optional second argument `keys_limit` (soft cap on number of stored keys). Not mentioned in the post; acceptable omission for an intro tutorial but could be added later.
- The throughput guideline "under a few hundred writes per second" is reasonable editorial advice given Keeper's Raft consensus overhead but is not a documented figure — fine as a rule of thumb.
- The `system.zookeeper` columns used in the monitoring example (`name`, `value`, `czxid`, `mzxid`, `ctime`, `mtime`) are all valid.
- The `Prerequisites` verification query (`SELECT * FROM system.zookeeper WHERE path = '/'`) is valid — `system.zookeeper` requires a `path` or `path_glob` predicate.
