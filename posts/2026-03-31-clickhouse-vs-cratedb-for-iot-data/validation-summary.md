# Validation Summary: ClickHouse vs CrateDB for IoT Data

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- CrateDB (distributed SQL database built on Lucene)
- MergeTree engine (ClickHouse storage engine)
- ZooKeeper / ClickHouse Keeper (replication coordination)
- LZ4 and ZSTD compression (ClickHouse)
- Lucene segment storage (CrateDB)

## Sources Consulted
- ClickHouse SQL reference for CREATE TABLE, MergeTree engine, PARTITION BY, ORDER BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (String, Float64, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse functions (toYYYYMM, toStartOfHour, now, INTERVAL syntax): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- CrateDB CREATE TABLE reference (CLUSTERED BY, shard configuration): https://cratedb.com/docs/crate/reference/en/latest/sql/statements/create-table.html
- CrateDB data types (TEXT, DOUBLE, TIMESTAMP WITH TIME ZONE): https://cratedb.com/docs/crate/reference/en/latest/general/ddl/data-types.html
- CrateDB scalar functions (date_trunc, now, INTERVAL syntax): https://cratedb.com/docs/crate/reference/en/latest/general/builtins/scalar-functions.html
- CrateDB geospatial types (GEO_POINT, GEO_SHAPE): https://cratedb.com/docs/crate/reference/en/latest/general/ddl/data-types.html#geo-point
- ClickHouse Keeper documentation: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper

## Issues Found
No technical issues found.

## Review Notes
- The ingestion and query performance numbers (500k-1M rows/sec for ClickHouse, 100k-300k for CrateDB, 5-20x query speed difference) are presented as approximate ranges rather than precise benchmarks, which is appropriate since actual numbers vary by hardware, schema, and workload.
- The claim that CrateDB nodes are "peers" is a slight simplification — CrateDB does distinguish master-eligible nodes from data nodes (as shown in the post's own diagram), but the general characterization of easier horizontal scaling compared to ClickHouse's manual sharding model is fair.
- All SQL examples for both ClickHouse and CrateDB are syntactically correct and use current, non-deprecated syntax.
- The compression ratio claims (10:1 for ClickHouse, 3:1 to 5:1 for CrateDB) are reasonable for the described IoT workload characteristics.
