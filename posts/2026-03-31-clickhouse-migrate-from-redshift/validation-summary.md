# Validation Summary: How to Migrate from Redshift to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Amazon Redshift (columnar data warehouse)
- ClickHouse (OLAP database)
- AWS S3 (data staging for export/import)
- PostgreSQL psql client (Redshift connection)
- Bash scripting (automation of unload/sync jobs)
- Parquet and CSV file formats
- IAM roles for S3 access

## Sources Consulted
- ClickHouse documentation: s3() table function — https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse documentation: aggregate function combinators and groupArray — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse documentation: data types (DateTime, DateTime64, Bool, LowCardinality) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: uniq function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- Amazon Redshift documentation: UNLOAD command — https://docs.aws.amazon.com/redshift/latest/dg/r_UNLOAD.html
- Amazon Redshift documentation: CONVERT_TIMEZONE — https://docs.aws.amazon.com/redshift/latest/dg/CONVERT_TIMEZONE.html
- Amazon Redshift documentation: LISTAGG — https://docs.aws.amazon.com/redshift/latest/dg/r_LISTAGG.html
- Amazon Redshift documentation: data types — https://docs.aws.amazon.com/redshift/latest/dg/c_Supported_data_types.html

## Issues Found

### 1. LISTAGG ClickHouse equivalent produced incorrect ordering (Fixed)
- **What was wrong:** The ClickHouse replacement for Redshift's `LISTAGG(event_type, ',') WITHIN GROUP (ORDER BY created_at)` used `arrayStringConcat(arraySort(groupArray(event_type)), ',')`, which sorts event_type values *alphabetically*. The Redshift original sorts by `created_at` (temporal order), producing functionally different results.
- **What was changed:** Replaced with `arrayStringConcat(groupArray(event_type ORDER BY created_at), ',')`, which uses ClickHouse's aggregate function `ORDER BY` clause (supported since version 22.8+) to preserve the temporal ordering semantics of the Redshift original.
- **Why:** The original translation would silently reorder aggregated values, producing incorrect results for any query relying on the `WITHIN GROUP (ORDER BY ...)` semantics.

## Review Notes
- **TIMESTAMP precision loss:** The data type mapping table maps Redshift `TIMESTAMP` (microsecond precision) to ClickHouse `DateTime` (second precision). This is lossy. If sub-second precision matters, `DateTime64(6)` would be the more accurate mapping. The current mapping is acceptable for many use cases but users with microsecond-precision data should be aware.
- **uniq() algorithm description:** The post describes ClickHouse's `uniq()` as "HyperLogLog-based." In practice, `uniq()` uses an adaptive `CombinedCardinalityEstimator` that switches between multiple algorithms (exact array, linear counting, HyperLogLog) depending on cardinality. This is a reasonable simplification for a blog audience but not strictly precise. The purely HyperLogLog function in ClickHouse is `uniqHLL12()`.
- **macOS compatibility of daily_sync.sh:** The `date -d "yesterday"` syntax in the daily sync script is GNU date (Linux). On macOS, the equivalent is `date -v-1d`. Since migration scripts typically run on Linux servers, this is acceptable but worth noting for users developing/testing on macOS.
- The Redshift UNLOAD syntax, S3 loading via the s3() table function, data type mappings, and other SQL rewrites (NVL, DATEADD, DATEDIFF, APPROXIMATE COUNT DISTINCT, MEDIAN, window functions) are all technically correct.
