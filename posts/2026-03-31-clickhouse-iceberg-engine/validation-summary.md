# Validation Summary: How to Use Iceberg Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse (23.3+ and 24.1+)
- Apache Iceberg table format
- Amazon S3
- Google Cloud Storage (S3-compatible endpoint)
- ClickHouse `Iceberg` / `IcebergS3` table engines
- ClickHouse named collections
- `system.query_log`

## Sources Consulted
- ClickHouse Iceberg Table Engine docs: https://clickhouse.com/docs/engines/table-engines/integrations/iceberg
- ClickHouse blog — "ClickHouse is data lake ready": https://clickhouse.com/blog/clickhouse-is-data-lake-ready
- ClickHouse blog — "Climbing the Iceberg with ClickHouse": https://clickhouse.com/blog/climbing-the-iceberg-with-clickhouse
- ClickHouse GCS integration docs: https://clickhouse.com/docs/integrations/gcs

## Issues Found

1. **Incorrect time-travel setting name.** The post referenced `iceberg_snapshot_timestamp_ms`. Per the official Iceberg engine docs, the correct setting is `iceberg_timestamp_ms` (the companion to `iceberg_snapshot_id`). Updated the example accordingly.

2. **GCS URL scheme wrong.** The GCS example used `gs://my-lake-bucket/...`. The ClickHouse `Iceberg` engine (alias of `IcebergS3`) does not recognize the `gs://` scheme. GCS access must go through the S3-compatible endpoint (`https://storage.googleapis.com/...`) with HMAC credentials. Replaced the URL and credential placeholders and added a one-line explanation clarifying the aliasing behavior.

3. **Named collection syntax incorrect.** The post used named-parameter form `Iceberg(named_collection = s3_lake, url = '...')`, which is not the documented syntax. The official docs show a positional form: `IcebergS3(iceberg_conf, filename = 'test_table')`. Rewrote the example as `Iceberg(s3_lake, filename = 'iceberg/sales/')`.

4. **Partition pruning requires an explicit setting.** The post implied partition pruning is automatic. ClickHouse requires `SET use_iceberg_partition_pruning = 1` (or a `SETTINGS` clause) to enable it. Added this to the prose and the example query.

## Review Notes
- `Iceberg` is still supported as an alias for `IcebergS3`, so `ENGINE = Iceberg(...)` remains valid throughout the post. Readers writing new code may prefer the explicit `IcebergS3` name.
- Initial Iceberg support shipped in ClickHouse 23.3 — the stated prerequisite is accurate.
- Write support is still not available as of the post date (April 2026); the read-only caveat in "Performance Tips" is correct.
- The official docs list `IcebergS3`, `IcebergAzure`, `IcebergHDFS`, and `IcebergLocal`; no dedicated `IcebergGCS` engine exists yet (a GCS catalog PR is in flight but not merged into the stable engine surface).
- The `system.query_log.tables` column used in the monitoring query is valid (Array(String) of table names touched).
