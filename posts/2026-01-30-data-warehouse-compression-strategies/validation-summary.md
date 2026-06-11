# Validation Summary: How to Build Compression Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Redshift column encodings, sort keys, distribution keys, and query plans
- ClickHouse column codecs, LowCardinality, MergeTree, LZ4, ZSTD, Delta, T64, and Gorilla
- PostgreSQL SQL, partitioned tables, PL/pgSQL procedures, and TOAST compression
- Data warehouse compression concepts including dictionary encoding, run-length encoding, delta encoding, and bit-packing

## Sources Consulted
- Amazon Redshift documentation: Compression encodings - https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html
- Amazon Redshift documentation: CREATE TABLE - https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_TABLE_NEW.html
- Amazon Redshift documentation: EXPLAIN - https://docs.aws.amazon.com/redshift/latest/dg/r_EXPLAIN.html
- Amazon Redshift documentation: Testing compression encodings - https://docs.aws.amazon.com/redshift/latest/dg/t_Verifying_data_compression.html
- ClickHouse documentation: Compression in ClickHouse - https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse documentation: LowCardinality(T) - https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- PostgreSQL documentation: CREATE TABLE - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL documentation: TOAST - https://www.postgresql.org/docs/current/storage-toast.html

## Issues Found
- Amazon Redshift examples used `ENCODE LZ4`, but Redshift's supported encodings do not include `LZ4`. Replaced those Redshift-specific examples with supported encodings such as `AZ64` for numeric data and `ZSTD` for general compression tests.
- The benchmarking section used `EXPLAIN ANALYZE` for Redshift. Redshift documents `EXPLAIN [ VERBOSE ] query`, so the examples now use `EXPLAIN` and note that execution-time benchmarking should be done by running the queries separately.
- The ZSTD compression-level examples used Redshift-style `ENCODE ZSTD(1)`, `ENCODE ZSTD(9)`, and `ENCODE ZSTD(19)`, which is not valid Redshift syntax. Reworked the examples as ClickHouse `CODEC(ZSTD(...))` DDL, where configurable ZSTD levels are supported.
- The PostgreSQL partition example used `VARCHAR(MAX)` and table-level `toast_compression` options, which are not PostgreSQL syntax. Changed the column to `TEXT` and used `ALTER COLUMN ... SET COMPRESSION lz4/pglz`, matching PostgreSQL's column-level TOAST compression syntax.
- The RLE analysis query grouped runs using `ORDER BY status`, which breaks consecutive-run detection. It now carries `order_date` and `order_id` through the CTEs and computes run groups in the original row order.
- The bit-packing query could calculate zero bits and divide by zero for single-value ranges. It now clamps the calculated bit width to at least one bit.
- The ClickHouse example applied `Gorilla` to `Decimal` columns while describing it as good for floating point. Changed those decimal examples to general ZSTD codecs and left `T64` for the small integer column.

## Review Notes
The post is technically relevant and implementation-focused. Some compression ratios and encoding recommendations remain illustrative and data-dependent, so readers should continue to benchmark with their own workloads before applying settings in production.
