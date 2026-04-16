# Validation Summary: How to Use Keeper Map Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper (ZooKeeper-compatible coordination service)
- KeeperMap table engine
- SQL (DDL/DML against ClickHouse)
- `system.zookeeper` system table

## Sources Consulted
- [KeeperMap table engine | ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/special/keeper-map)
- [system.zookeeper | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/zookeeper)
- [ClickHouse Keeper | ClickHouse Docs](https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper)
- [KeeperMap storage engine PR #39976 (ClickHouse/ClickHouse)](https://github.com/ClickHouse/ClickHouse/pull/39976)
- [Add strict mode for KeeperMap PR #48293 (ClickHouse/ClickHouse)](https://github.com/ClickHouse/ClickHouse/pull/48293)
- [ZooKeeper Admin docs (jute.maxbuffer)](https://zookeeper.apache.org/doc/r3.6.2/zookeeperAdmin.html)

## Issues Found
1. **Wrong column name in `system.zookeeper` query.** The post used `data_length`, but the actual column in ClickHouse's `system.zookeeper` table is `dataLength` (camelCase, `Int32`). Updated the example to use `dataLength` and also included the `name` column so the result is meaningful (the query returns child znodes of the given path).

## Review Notes
- The CREATE TABLE syntax `ENGINE = KeeperMap('/path') PRIMARY KEY column_name` matches the official documentation. The engine also accepts an optional second `keys_limit` argument (`KeeperMap(root_path, keys_limit)`) — not mentioned in the post, but its omission is fine since it is optional.
- The post correctly notes that INSERT replaces existing values for the same primary key. Per the official docs this is the default behavior; the `keeper_map_strict_mode` setting (when enabled) causes an exception to be thrown instead. Worth noting in a future revision but not technically incorrect.
- KeeperMap requires exactly one column in the primary key — the examples comply with this.
- The "Maximum value size: 1 MB per row" claim aligns with ZooKeeper's `jute.maxbuffer` default (1,048,575 bytes ≈ 1 MiB), which ClickHouse Keeper inherits in practice. This is configurable, but raising it is strongly discouraged, so the post's framing is accurate.
- The `system.zookeeper` query requires a `WHERE path = '...'` (or `path IN (...)`) clause — the example correctly includes it.
- Replication/consistency description is accurate: KeeperMap provides linearizable writes and sequentially consistent reads through Keeper's Raft consensus.
- Minor stylistic note (not changed): the comment "KeeperMap supports UPDATE via mutations" sits above an `INSERT` statement that uses primary-key replacement; an `ALTER TABLE ... UPDATE` mutation example would more directly illustrate the comment, but the technical claim itself is correct.
