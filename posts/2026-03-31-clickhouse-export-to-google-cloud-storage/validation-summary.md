# Validation Summary: How to Export ClickHouse Data to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (`gcs` table function, `INSERT INTO FUNCTION`, `clickhouse-client`)
- Google Cloud Storage (GCS) XML API with HMAC keys
- BigQuery external tables with Hive-style partitioning
- File formats: CSVWithNames, Parquet, JSONEachRow
- gzip compression
- Bash scripting

## Sources Consulted
- [ClickHouse gcs table function docs](https://clickhouse.com/docs/en/sql-reference/table-functions/gcs)
- [ClickHouse S3 table engine docs (per-endpoint config)](https://clickhouse.com/docs/en/engines/table-engines/integrations/s3)
- [ClickHouse s3 table function docs](https://clickhouse.com/docs/sql-reference/table-functions/s3)
- [BigQuery Hive-partitioned external tables docs](https://docs.cloud.google.com/bigquery/docs/hive-partitioned-queries)
- [BigQuery CREATE EXTERNAL TABLE with hive partitioning sample](https://docs.cloud.google.com/bigquery/docs/samples/bigquery-create-table-external-hivepartitioned)

## Issues Found
- **Section heading "Using GCS with a Service Account" and body claim "Configure a service account JSON key"**: The ClickHouse `gcs` table function authenticates via the GCS XML API using HMAC keys, not a service account JSON key. The example already showed HMAC keys, so the narrative contradicted the code. Renamed the section to "Configuring GCS Credentials in config.xml" and rewrote the explanation to correctly state that `gcs` is an alias of `s3` and uses HMAC keys.
- **`<gcs>` XML tag in `config.xml`**: ClickHouse has no `<gcs>` configuration section. Per-endpoint credentials live under `<s3>` with a named child element (e.g., `<gcs_endpoint>`). Updated the snippet to wrap the endpoint in `<s3><gcs_endpoint>...</gcs_endpoint></s3>`.

## Review Notes
- `gcs` function signature `gcs(url, hmac_key, hmac_secret, format[, compression])` is correct; compression values like `gzip` are supported (documented list: `none`, `gzip`/`gz`, `brotli`/`br`, `xz`/`LZMA`, `zstd`/`zst`).
- BigQuery `CREATE EXTERNAL TABLE` options (`format`, `uris`, `hive_partition_uri_prefix`) are correct; auto-detect mode is implied by omitting explicit partition columns.
- `CSVWithNames`, `Parquet`, and `JSONEachRow` are all valid ClickHouse formats.
- `clickhouse-client --query` with a multi-line quoted SQL string is valid usage.
- HMAC keys are indeed generated in the Cloud Storage console under Settings → Interoperability, so the instruction is accurate.
- Readers should note that large `INSERT INTO FUNCTION gcs(...)` queries produce a single file per worker/part; for very large exports, consider `PARTITION BY` or splitting by key to get multiple Parquet files — out of scope for this post.
