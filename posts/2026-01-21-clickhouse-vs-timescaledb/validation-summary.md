# Validation Summary: ClickHouse vs TimescaleDB: Which to Choose for Time-Series Data

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- ClickHouse
- TimescaleDB
- PostgreSQL
- SQL
- ClickHouse CLI
- psql

## Sources Consulted
- ClickHouse documentation: What is ClickHouse? https://clickhouse.com/docs/intro
- ClickHouse documentation: Architecture overview https://clickhouse.com/docs/development/architecture
- ClickHouse documentation: Distributed table engine https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse documentation: INSERT INTO statement https://clickhouse.com/docs/sql-reference/statements/insert-into
- ClickHouse documentation: Asynchronous inserts https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse documentation: Updating and deleting data / mutations https://clickhouse.com/docs/guides/developer/mutations
- ClickHouse documentation: Transactional ACID support https://clickhouse.com/docs/guides/developer/transactional
- ClickHouse documentation: Compression in ClickHouse https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- TimescaleDB/Tiger Data documentation: Hypercore ALTER TABLE https://www.tigerdata.com/docs/reference/timescaledb/hypercore/alter_table
- TimescaleDB/Tiger Data documentation: add_columnstore_policy https://www.tigerdata.com/docs/reference/timescaledb/hypercore/add_columnstore_policy
- TimescaleDB/Tiger Data documentation: hypertable_columnstore_stats https://www.tigerdata.com/docs/reference/timescaledb/hypercore/hypertable_columnstore_stats
- TimescaleDB changelog: multi-node removal in 2.14 https://github.com/timescale/timescaledb/blob/main/CHANGELOG.md
- TimescaleDB documentation: Multi-node deprecation notice https://github.com/timescale/timescaledb/blob/main/docs/MultiNodeDeprecation.md
- PostgreSQL documentation: COPY https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL documentation: psql \copy https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The post described TimescaleDB multi-node as a current Enterprise scaling option. Updated it to state that distributed hypertables were deprecated in TimescaleDB 2.13 and removed starting in 2.14, and revised scaling guidance toward PostgreSQL replication/read replicas and application-level sharding.
- The TimescaleDB compression example used the old compression API (`timescaledb.compress`, `add_compression_policy`, and `hypertable_compression_stats`). Updated it to the current Hypercore columnstore API (`timescaledb.enable_columnstore`, `CALL add_columnstore_policy`, and `hypertable_columnstore_stats`).
- The post gave exact query performance, ingestion, storage, and cloud-cost numbers without schema, hardware, version, or workload context. Replaced those with workload-dependent guidance so readers do not treat illustrative numbers as guarantees.
- The ClickHouse scaling section stated "No single point of failure" unconditionally. Clarified that this depends on correctly configuring replication and ClickHouse Keeper.
- The migration examples used server-side file assumptions and were fenced as Python even though they were shell commands. Updated them to bash examples using `psql \COPY` and ClickHouse `FROM INFILE` for a local CSV workflow.
- The ClickHouse transaction comparison was too vague and tied to async inserts. Updated it to "Limited ACID support for inserts" to better match ClickHouse's documented insert transaction semantics.

## Review Notes
Performance and compression recommendations remain inherently workload-dependent. Future updates could improve the guide by adding version-scoped benchmark methodology and sample table definitions for reproducible comparisons.
