# Validation Summary: How to Configure ClickHouse Cloud Backups

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse Cloud (managed service)
- ClickHouse Cloud REST API
- ClickHouse SQL (`system.parts`, `s3()` table function)
- AWS S3 (as an export target)

## Sources Consulted
- ClickHouse Cloud Backup Overview: https://clickhouse.com/docs/cloud/manage/backups/overview
- ClickHouse Cloud Configurable Backups: https://clickhouse.com/docs/cloud/manage/backups/configurable-backups
- ClickHouse Cloud API Swagger Reference: https://clickhouse.com/docs/cloud/manage/api/swagger
- ClickHouse Cloud Services API Reference: https://clickhouse.com/docs/cloud/manage/api/services-api-reference
- ClickHouse Cloud Tiers: https://clickhouse.com/docs/cloud/manage/cloud-tiers
- ClickHouse `s3` table function: https://clickhouse.com/docs/sql-reference/table-functions/s3

## Issues Found

1. **Outdated tier names and incorrect retention defaults.** The post claimed "1 day for Development tier, 7 days for Production tier by default." ClickHouse Cloud transitioned from Development/Production to Basic/Scale/Enterprise tiers (effective Jan 27, 2025; PAYG migration completed July 23, 2025). Per current docs, the default is "a backup every day, with a 24 hour retention" for all tiers, with configurable retention/frequency available on Scale and Enterprise tiers. Updated the section to reflect this.

2. **Wrong API authentication method.** Both API examples used `Authorization: Bearer ${CLICKHOUSE_API_KEY}`. The ClickHouse Cloud API uses HTTP Basic Auth with a Key ID and Key Secret (`--user "KEY_ID:KEY_SECRET"`). Replaced both Bearer header examples with the correct `--user` flag.

3. **Non-existent restore endpoint.** The post posted to `/v1/organizations/{ORG_ID}/services/{SERVICE_ID}/backups/{BACKUP_ID}/restore`, which is not a documented API endpoint. The actual restore flow is to create a new service via `POST /v1/organizations/{orgId}/services` and pass the `backupId` field; the new service must match the original's region and tier. Rewrote the example accordingly.

4. **Backup list field name.** Adjusted the `jq` projection to use `startedAt` (the field name returned by the backups list endpoint) instead of `createdAt`.

5. **Summary references stale "7-day default."** Updated the closing paragraph to reflect the 24-hour default retention and that configurability is a Scale/Enterprise feature, not a global default.

## Review Notes

- The `system.parts` query is correct, but it reports the size of active data parts on the service, not the size of stored backups. ClickHouse Cloud does not currently expose backup byte size via SQL; this is fine as a proxy for "what would a fresh backup roughly cost," but a future revision could clarify the distinction.
- The S3 export example uses the four-arg `s3(url, key, secret, format)` overload, which is valid. Embedding credentials inline is documented but not best practice — using a named storage configuration or IAM role is preferable in production.
- The PITR section is accurate: ClickHouse Cloud restores to discrete snapshots, not arbitrary points in time.
- The blog uses an example file path with `2024-03-31` while the post date is `2026-03-31`; this is cosmetic and was not changed.
