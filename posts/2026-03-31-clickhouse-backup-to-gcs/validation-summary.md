# Validation Summary: How to Back Up ClickHouse to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (BACKUP/RESTORE feature, `system.backups` table, `storage_configuration` disks)
- Google Cloud Storage (GCS) — accessed via the S3-compatible XML API
- HMAC keys / GCS Interoperability authentication
- Bash / cron for automation

## Sources Consulted
- [ClickHouse Backup and Restore docs](https://clickhouse.com/docs/operations/backup)
- [ClickHouse Backup overview docs](https://clickhouse.com/docs/operations/backup/overview)
- [Integrate Google Cloud Storage with ClickHouse](https://clickhouse.com/docs/integrations/gcs)
- [ClickHouse PR #39503 — Improve system.backups table](https://github.com/ClickHouse/ClickHouse/pull/39503) (introduced `uncompressed_size`/`compressed_size` columns)

## Issues Found

1. **Disk type was incorrect.** The post used `<type>object_storage</type>` with `<object_storage_type>gcs</object_storage_type>`. ClickHouse does not have a native `gcs` object storage backend — GCS is accessed through its S3-compatible XML API, so the disk type is `s3`. Replaced the disk definition with the official `type: s3` form using an `endpoint` URL of `https://storage.googleapis.com/<bucket>/<path>/`.

2. **`support_batch_delete` was missing.** GCS does not support the S3 batch delete operation. Without `<support_batch_delete>false</support_batch_delete>`, ClickHouse will fail when removing objects. Added this required setting.

3. **Authentication mechanism was wrong.** The post claimed ClickHouse uses Application Default Credentials with `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service account JSON key. ClickHouse's S3 client does not consume Google's ADC — it requires HMAC `access_key_id` / `secret_access_key` generated through Cloud Storage Interoperability settings. Rewrote the Prerequisites and Authentication sections accordingly, including the `from_env="..."` pattern for keeping secrets out of the config file.

4. **`system.backups` columns were inaccurate.** The post selected `total_size` and `exception`, neither of which exist in current ClickHouse versions. The correct columns are `uncompressed_size`, `compressed_size`, and `error` (per PR #39503 which split the original `total_size` column). Updated the SELECT to use the correct column names and added `name`.

5. **`SETTINGS async = true` is non-canonical.** The documented BACKUP/RESTORE syntax uses the `ASYNC` keyword (e.g. `BACKUP DATABASE ... TO Disk(...) ASYNC`), not a SETTINGS clause. Replaced both occurrences.

## Review Notes

- The `base_backup` SETTINGS syntax for incremental backups is correct as written.
- The `RESTORE ... AS new_name` syntax is correct.
- The `<allowed_disk>` and `<allowed_path>` server config keys are correct.
- The cron line and shell automation example are syntactically fine and unchanged.
- Storage Object Admin is sufficient permission for the underlying service account, but in practice the HMAC key inherits the service account's IAM permissions — readers should grant the principle of least privilege (e.g. Storage Object Admin scoped to the backup bucket).
