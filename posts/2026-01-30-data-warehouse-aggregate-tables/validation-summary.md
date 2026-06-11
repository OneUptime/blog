# Validation Summary: How to Create Aggregate Tables

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- SQL aggregate tables
- Data warehouse query optimization
- PostgreSQL date/time functions
- PostgreSQL declarative table partitioning
- PostgreSQL views, indexes, arrays, and relation-size functions
- BigQuery and Snowflake cost models
- HyperLogLog-style distinct-count sketches

## Sources Consulted
- PostgreSQL documentation: Date/Time Functions and Operators - https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL documentation: Table Partitioning - https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: CREATE VIEW - https://www.postgresql.org/docs/current/sql-createview.html
- PostgreSQL documentation: Arrays - https://www.postgresql.org/docs/current/arrays.html
- Google Cloud documentation: BigQuery pricing - https://cloud.google.com/bigquery/pricing
- Snowflake documentation: Understanding compute cost - https://docs.snowflake.com/en/user-guide/cost-understanding-compute

## Issues Found
- The `distinct_customers` column comment implied the stored integer could be exact or approximate depending only on volume. Since `COUNT(DISTINCT ...)` is non-additive and cannot be rolled up exactly across coarser grains, changed the comment to clarify that the integer is exact only at the table's grain and that sketches should be used for rollups.
- The PostgreSQL partition-swap example used `CREATE TABLE ... AS SELECT ...` for a staging table that is later attached as a partition. PostgreSQL requires attached partitions to match the parent table's columns exactly, and the official partition-maintenance pattern recommends `CREATE TABLE ... (LIKE parent INCLUDING DEFAULTS INCLUDING CONSTRAINTS)` plus a matching `CHECK` constraint to avoid a validation scan. Updated the example accordingly.

## Review Notes
- The SQL examples are PostgreSQL-flavored because they use `::DATE`, `TEXT[]`, declarative partitioning, and `pg_total_relation_size`.
- The BigQuery cost claim is accurate for on-demand pricing, which charges by bytes processed. The Snowflake cost discussion should be read as compute-runtime reduction rather than strict per-query byte-scan pricing, because Snowflake virtual warehouses are billed by size and running time.
