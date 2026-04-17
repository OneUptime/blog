# Validation Summary: How to Optimize ClickHouse Cloud Spending

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud REST API (service/replica scaling)
- ClickHouse SQL (ALTER TABLE, TTL, LowCardinality, system.columns, system.query_log)
- `clusterAllReplicas` table function
- `clickhouse-client` CLI + cron

## Sources Consulted
- ClickHouse Cloud API Swagger / reference: https://clickhouse.com/docs/cloud/manage/api/swagger
- ClickHouse Cloud architecture (object storage model): https://clickhouse.com/docs/cloud/reference/architecture
- `system.columns` reference: https://clickhouse.com/docs/en/operations/system-tables/columns
- `system.query_log` reference: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse TTL / MergeTree TTL docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- LowCardinality docs: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found

1. **Incorrect ClickHouse Cloud autoscaling API request.** The original `curl` targeted `PATCH /v1/organizations/{org_id}/services/{service_id}` with an `autoscaling` nested object and fields `minTotalMemoryGb` / `maxTotalMemoryGb`. Per the Cloud API spec, autoscaling is updated via the separate `/replicaScaling` subresource with flat top-level fields, and the replica-memory fields are named `minReplicaMemoryGb` / `maxReplicaMemoryGb` (the `…TotalMemoryGb` variants belonged to the deprecated `/scaling` endpoint). Updated the endpoint path, flattened the body, added `idleScaling: true`, and renamed the memory fields.

2. **"Tiered storage" section did not apply to ClickHouse Cloud.** The original recommended `ALTER TABLE … MODIFY TTL … TO DISK 's3'`. ClickHouse Cloud already stores all data on shared object storage by default; users do not define local/S3 disk tiers or storage policies, so `TO DISK 's3'` is not a valid move for a Cloud service. Rewrote the section to explain that archival is handled automatically by the platform and kept a valid `DELETE` TTL example for bounding retention.

## Review Notes
- `system.columns` ratio calculation (`data_compressed_bytes / data_uncompressed_bytes`) can divide by zero on empty columns; a `nullif(data_uncompressed_bytes, 0)` guard would be safer but is a quality-of-life improvement, not a correctness bug.
- The `clusterAllReplicas(default, system.query_log)` call relies on the default cluster name `default`, which is the standard name in ClickHouse Cloud — correct for that target but would need changing on self-hosted clusters with different naming.
- `LowCardinality(String)` is well suited below ~10k distinct values; beyond that, performance can actually degrade — the post's guideline matches the official recommendation.
- The `clickhouse-client` cron example assumes credentials are configured in the environment / client config; readers running it in CI will still need to pass `--host`, `--user`, and `--password` (or equivalents) — worth a follow-up mention but not inaccurate as written.
