# Validation Summary: How to Migrate Between ClickHouse Cloud Regions

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse client (`clickhouse-client`)
- ClickHouse Cloud REST API
- AWS S3 (as a transfer medium)
- ClickHouse `s3` table function
- Parquet format
- `system.tables` system database

## Sources Consulted
- ClickHouse Cloud API reference (`POST /v1/organizations/{organizationId}/services`)
- ClickHouse Cloud networking / endpoints documentation (port assignments)
- ClickHouse `clickhouse-client` documentation
- ClickHouse `s3` table function documentation (https://clickhouse.com/docs/en/sql-reference/table-functions/s3)
- ClickHouse `system.tables` schema reference
- ClickHouse v24.8 changelog (multi-query default behavior)

## Issues Found

1. **Wrong port for `clickhouse client` native connections.** The post used `--port 8443` together with `--secure`. Port 8443 is the HTTPS interface for ClickHouse Cloud; the native TCP `clickhouse-client` uses port 9440 with `--secure`. Updated all `clickhouse client` examples (Step 2 single-table export, Step 2 full-schema export, and Step 4 row-count validation) to use `--port 9440`.

2. **Broken full-schema export pipeline.** The original second example in Step 2 generated `SHOW CREATE TABLE ...` strings, then piped them into a second `clickhouse client --multiquery` invocation that had no host/credentials and would default to `localhost`. Replaced with a single-pass query that selects `create_table_query` directly from `system.tables`, filters out system schemas plus views/materialized views (whose dependencies need separate handling), and uses `FORMAT TabSeparatedRaw` so the DDL is written verbatim to the file.

3. **Minor: `INFORMATION_SCHEMA` filter.** ClickHouse exposes both `information_schema` and `INFORMATION_SCHEMA` (uppercase alias). Added the uppercase form to the exclusion list so it isn't accidentally re-emitted.

## Review Notes

- The ClickHouse Cloud API accepts `tier: "production"` and `minTotalMemoryGb` / `maxTotalMemoryGb`, though these are documented as deprecated in favor of newer tier names (e.g. Scale, Enterprise) and per-replica memory fields (`minReplicaMemoryGb` / `maxReplicaMemoryGb`). The values still work today, so the example was left unchanged, but readers building new automation should consider the newer fields. Memory values must be multiples of 12 between 24 and 1068; 24 and 96 satisfy that.
- `--multiquery` was made the default in ClickHouse 24.8 and the flag is now obsolete (still accepted). Removed as part of fix #2 above.
- Embedding AWS credentials inline in the `s3()` table function works but is not best practice; using a named collection or IAM role would be safer. Out of scope for this technical-accuracy review.
- The `s3()` function call signature `(url, access_key_id, secret_access_key, format)` and the `INSERT INTO FUNCTION s3(...)` syntax are correct.
- The Cloud API endpoint path `/v1/organizations/{ORG_ID}/services` and Bearer auth header are correct.
- ClickHouse Cloud hostnames per service are stable, as the post claims.
