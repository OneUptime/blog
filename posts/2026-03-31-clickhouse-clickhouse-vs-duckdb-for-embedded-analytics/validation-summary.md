# Validation Summary: ClickHouse vs DuckDB for Embedded Analytics

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- ClickHouse (server-based OLAP database)
- DuckDB (embedded in-process OLAP database)
- Python (`clickhouse-driver`, `duckdb` client libraries)
- Pandas (DataFrame integration with DuckDB)
- Parquet / S3 file formats and table functions
- Docker (ClickHouse server deployment)

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `s3` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse `uniq` function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- clickhouse-driver Python docs: https://clickhouse-driver.readthedocs.io/
- DuckDB official documentation: https://duckdb.org/docs/
- DuckDB Python API: https://duckdb.org/docs/api/python/overview
- DuckDB Parquet: https://duckdb.org/docs/data/parquet/overview
- DuckDB date/interval functions: https://duckdb.org/docs/sql/functions/date
- DuckDB concurrency / read_only connections: https://duckdb.org/docs/connect/concurrency

## Issues Found
No technical issues found.

All code examples are syntactically valid and use current, non-deprecated APIs:
- ClickHouse Docker ports (8123 HTTP, 9000 native TCP) are correct.
- ClickHouse SQL functions (`toStartOfDay`, `toStartOfMonth`, `uniq`, `today()`, `count()`, `s3()` table function) are accurate.
- DuckDB Python API usage (`duckdb.connect`, `execute`, `fetchall`, `fetchdf`, `read_only` kwarg) is correct.
- DuckDB SQL (`date_trunc`, `INTERVAL 30 DAY`, Parquet glob queries, Pandas DataFrame replacement scans) is valid.
- Claims about concurrency (ClickHouse multi-user, DuckDB single-writer with multiple read-only connections) match the official documentation.
- Deployment model descriptions (ClickHouse server, DuckDB embedded/in-process) are accurate.

## Review Notes
- Minor semantic note (not an error): the ClickHouse example uses `uniq(user_id)` (approximate distinct), while the DuckDB equivalent uses `count(DISTINCT user_id)` (exact). The post presents them as "equivalent" queries, which is a fair characterization for a comparison, but readers needing exact parity could use ClickHouse's `uniqExact()` or `count(DISTINCT user_id)`.
- The claim that DuckDB handles "hundreds of GB" on a single node is a reasonable practical guideline; DuckDB can technically process larger datasets via out-of-core execution, but the stated ranges are appropriate for typical single-node workloads.
- No version-specific caveats: both engines' APIs used here have been stable across recent releases.
