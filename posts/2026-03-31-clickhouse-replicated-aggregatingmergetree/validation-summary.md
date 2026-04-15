# Validation Summary: How to Use ReplicatedAggregatingMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplicatedAggregatingMergeTree engine
- AggregatingMergeTree engine
- ZooKeeper / ClickHouse Keeper
- AggregateFunction column types and State/Merge combinators
- Materialized Views
- Distributed table engine
- Null table engine

## Sources Consulted
- ClickHouse Configuration Files docs: https://clickhouse.com/docs/operations/configuration-files
- ClickHouse Replication docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse AggregateFunction type docs: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse system.replicas docs: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse Distributed engine docs: https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse ALTER TABLE docs: https://clickhouse.com/docs/sql-reference/statements/alter
- ClickHouse Materialized Views blog: https://clickhouse.com/blog/using-materialized-views-in-clickhouse

## Issues Found

1. **Deprecated `<yandex>` root XML tag**: The macros config example used `<yandex>` as the root element, which has been deprecated since ClickHouse ~21.x. Changed to `<clickhouse>`, which is the current recommended root tag per official documentation.

2. **Incorrect `prefer_localhost_replica` usage**: The "Querying a Specific Replica" section showed `prefer_localhost_replica = 1` on a direct query to a local replicated table. This setting only affects queries routed through a Distributed table and has no effect on direct replicated table queries. Rewrote the section to explain that connecting directly to a node and querying the local table is the correct way to read from a specific replica.

3. **Incorrect schema change limitation**: The post stated "Schema changes (adding columns) must be applied to all replicas." This is wrong — ALTER TABLE operations on replicated tables are automatically replicated through ZooKeeper/Keeper. Updated to reflect that schema changes are replicated but all replicas should be running for consistent application.

4. **Incomplete sample output for `system.replicas`**: The SELECT query included `replica_path` and `is_readonly` columns, but the sample output omitted them. Added the missing columns to the sample output for consistency.

## Review Notes
- All SQL syntax (CREATE TABLE, INSERT with State combinators, SELECT with Merge combinators, OPTIMIZE, Distributed table creation) is correct and follows current ClickHouse conventions.
- The `AggregateFunction(count)` with no type argument is valid since `count()` takes no column arguments.
- The Null engine + Materialized View feeder pattern is a well-documented and recommended approach for streaming aggregation in ClickHouse.
- The `system.replicas` columns referenced all exist in the current schema.
