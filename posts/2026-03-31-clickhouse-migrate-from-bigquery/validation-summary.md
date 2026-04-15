# Validation Summary: How to Migrate from BigQuery to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Google BigQuery (data warehouse, bq CLI, partition decorators)
- ClickHouse (MergeTree engine, gcs() table function, clickhouse-client, aggregate functions)
- Google Cloud Storage (gsutil, HMAC keys)
- SQL (BigQuery Standard SQL, ClickHouse SQL dialect)

## Sources Consulted
- BigQuery data types documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
- ClickHouse Decimal type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse gcs() table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/gcs
- ClickHouse GCS integration guide: https://clickhouse.com/docs/integrations/gcs
- ClickHouse groupArray documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse array functions documentation: https://clickhouse.com/docs/sql-reference/functions/array-functions
- bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference

## Issues Found

1. **NUMERIC type mapping incorrect (data type table and schema DDL)**: The post mapped BigQuery `NUMERIC` to ClickHouse `Decimal(29, 9)`. BigQuery NUMERIC has 38 total digits of precision with 9 digits of scale (29 integer digits + 9 fractional = 38 total). Since ClickHouse `Decimal(P, S)` defines P as total precision, the correct mapping is `Decimal(38, 9)`. The post confused the 29 integer digits with the total precision. Fixed in both the data type mapping table and the CREATE TABLE DDL.

2. **GCS table function URL format incorrect**: The `gcs()` table function requires HTTPS URLs in the format `https://storage.googleapis.com/bucket/path`, not `gs://` URIs. The `gcs()` function is an alias for ClickHouse's `s3()` function and accesses GCS via the S3-compatible XML API. Also corrected the placeholder credential names from `YOUR_GCS_ACCESS_KEY`/`YOUR_GCS_SECRET` to `YOUR_HMAC_KEY`/`YOUR_HMAC_SECRET` since GCS interoperability uses HMAC keys, not standard GCP credentials. Fixed in both gcs() examples (CSV and Parquet).

3. **STRING_AGG equivalent had wrong ordering semantics**: The BigQuery `STRING_AGG(event_type, ',' ORDER BY created_at)` concatenates values ordered by timestamp. The ClickHouse equivalent used `arraySort(groupArray(event_type))` which sorts alphabetically by event_type value, producing different results. Fixed to use `groupArray(event_type ORDER BY created_at)` which uses ClickHouse's aggregate function ORDER BY clause (available since v22.8) to preserve the temporal ordering.

## Review Notes
- The BigQuery DATE_TRUNC example in Step 6 uses `DATE_TRUNC(created_at, HOUR)`, but since `created_at` is a TIMESTAMP type, BigQuery would technically require `TIMESTAMP_TRUNC`. However, the example is demonstrating a general function mapping concept and is acceptable as-is.
- The sync script in Step 8 uses `date -d "yesterday"` which is GNU/Linux-specific syntax (macOS uses `date -v-1d`). This is fine since cron jobs typically run on Linux servers.
- The `uniq()` function description as "HyperLogLog based" is a simplification. ClickHouse's `uniq` uses an adaptive algorithm that combines multiple methods depending on cardinality, but HyperLogLog is the primary method for large cardinalities, so this is acceptable.
- ClickHouse now has a native JSON data type (experimental in some versions, GA in recent ones). The recommendation to store JSON as String and use JSONExtract functions is still valid and is the more established approach.
