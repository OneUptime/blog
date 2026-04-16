# Validation Summary: How to Use Hive Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Hive table engine, MergeTree engine)
- Apache Hive and Hive Metastore (Thrift API)
- HDFS / S3 storage
- Parquet and ORC file formats

## Sources Consulted
- ClickHouse Hive table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/hive
- ClickHouse `ENABLE_HIVE` CMake flag: https://github.com/ClickHouse/ClickHouse/blob/master/contrib/hive-metastore-cmake/CMakeLists.txt
- ClickHouse `StorageHive.cpp` source (USE_HIVE conditional compilation)

## Issues Found
- The metastore connection string in all `ENGINE = Hive(...)` examples used `'hive-metastore:9083'` without the required `thrift://` URI scheme. Per the official ClickHouse docs the first argument must be in the form `'thrift://host:port'`. Updated the syntax comment plus all four `CREATE TABLE` examples (`hive_orders` twice, `hive_page_views`, `hive_user_sessions`) to use `'thrift://hive-metastore:9083'`.

## Review Notes
- `ENABLE_HIVE=1` as a build flag is correct — verified against the `contrib/hive-metastore-cmake/CMakeLists.txt` `option(ENABLE_HIVE ...)` declaration.
- Supported formats list (Parquet, ORC, text) matches the official docs.
- The `EXPLAIN` output snippet showing `ReadFromHive (partitions resolved: 1 of 365)` is illustrative; the real `EXPLAIN` textual format may differ across ClickHouse versions, but it communicates the intent correctly.
- Type mapping table is reasonable. Note the ClickHouse docs show one example mapping Hive `decimal(10,0)` to `Float64`, but mapping Hive `DECIMAL(P,S)` to ClickHouse `Decimal(P, S)` is the more precision-preserving choice and is kept as-is.
- The post does not include `PARTITION BY` on any Hive-engine `CREATE TABLE`. The docs note that the partition-by expression must match the source Hive table when it is partitioned. Since the post's `hive_orders`, `hive_page_views`, and `hive_user_sessions` examples do not claim their source Hive tables are partitioned, this is left unchanged. A future improvement would be to add an explicit `PARTITION BY` example for a partitioned source table (the `hive_events` partition-pruning section alludes to one but never shows its `CREATE TABLE`).
- The docs also note the Hive engine is not supported in ClickHouse Cloud; the post does not mention this caveat, which could be a useful addition.
