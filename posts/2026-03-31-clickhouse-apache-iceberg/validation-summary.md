# Validation Summary: How to Query Apache Iceberg Tables from ClickHouse

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse (Iceberg engine and `iceberg()` table function)
- Apache Iceberg (table format, partition transforms, schema evolution, snapshots)
- Apache Spark (PySpark, Iceberg Spark SQL extensions)
- Amazon S3 / Google Cloud Storage / MinIO (object storage backends)

## Sources Consulted
- ClickHouse Iceberg table engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/iceberg
- ClickHouse `iceberg` table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/iceberg
- ClickHouse 23.2 release notes: https://clickhouse.com/blog/clickhouse-release-23-02
- Apache Iceberg Spark DDL docs: https://iceberg.apache.org/docs/latest/spark-ddl/
- Apache Iceberg partition transforms reference
- Python `datetime` for Unix timestamp verification

## Issues Found
1. **Incorrect Unix timestamp in time travel example.** The `iceberg_timestamp_ms` value `1743379200000` was commented as `2026-03-30 00:00:00 UTC`, but that epoch millisecond value actually corresponds to `2025-03-31 00:00:00 UTC`. Replaced with the correct value `1774828800000` which corresponds to `2026-03-30 00:00:00 UTC` (verified via Python `datetime`).
2. **Invalid GCS credential pattern.** The GCS example used `'SERVICE_ACCOUNT_JSON_KEY'` plus an empty secret. ClickHouse has no `IcebergGCS` engine/function; the `Iceberg` engine is an alias for `IcebergS3` and uses the S3 protocol, which for GCS requires **HMAC credentials** (access key ID + secret) against GCS's S3-compatible endpoint. Replaced with `'GCS_HMAC_ACCESS_ID'` / `'GCS_HMAC_SECRET'` placeholders and clarified in the comment.

## Review Notes
- The claim "ClickHouse 23.4+ includes native support" is technically correct (all 23.4+ versions do support Iceberg reads), though Iceberg v1 support was actually introduced in 23.2 and v2 format support in 23.4. The existing wording is accurate for users on 23.4+ and was left unchanged.
- `iceberg` is officially documented as an alias for `icebergS3`, and `ENGINE = Iceberg(...)` is an alias for `IcebergS3(...)`. The signatures used in the post match the docs.
- `iceberg_snapshot_id` and `iceberg_timestamp_ms` are both valid ClickHouse settings for Iceberg time travel. Note: these two settings cannot be used together in the same query — worth flagging for readers but not incorrect as written.
- Iceberg Spark SQL DDL accepts plural partition transforms (`years`, `months`, `days`, `hours`) which map to the underlying singular Iceberg transforms — `months(ts)` is valid.
- Schema evolution: ClickHouse does handle Iceberg schema evolution on reads, so the demonstration is correct; for persistent `ENGINE = Iceberg` tables created without explicit schema, ClickHouse re-reads the Iceberg metadata, surfacing new columns in subsequent queries.
- MinIO example signature matches S3-compatible usage and is correct.
- The MinIO / HTTP URL form with port `:9000` requires ClickHouse to be configured to allow non-HTTPS S3 endpoints — environment-specific, but not an error in the code.
