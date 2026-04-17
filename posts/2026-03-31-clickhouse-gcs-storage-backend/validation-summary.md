# Validation Summary: How to Configure GCS as ClickHouse Storage Backend

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (storage_configuration, MergeTree, TTL, storage policies)
- Google Cloud Storage (GCS)
- GCS S3 interoperability API
- HMAC keys for service accounts
- `gcloud` and `gsutil` CLI tools

## Sources Consulted
- [ClickHouse: Storing Data on External Storage](https://clickhouse.com/docs/en/operations/storing-data)
- [ClickHouse: Integrating S3](https://clickhouse.com/docs/en/integrations/s3)
- [ClickHouse: GCS Integration](https://clickhouse.com/docs/en/integrations/gcs)
- [ClickHouse Issue #30510 — `send_metadata` problems with AWS S3](https://github.com/ClickHouse/ClickHouse/issues/30510)
- [Google Cloud: gsutil iam command](https://cloud.google.com/storage/docs/gsutil/commands/iam)
- [Google Cloud: Cloud Storage IAM roles](https://docs.cloud.google.com/storage/docs/access-control/iam-roles)
- [GoogleCloudPlatform/gsutil source — iam.py role shorthand handling](https://github.com/GoogleCloudPlatform/gsutil/blob/master/gslib/commands/iam.py)

## Issues Found
1. **Invalid ClickHouse setting `<use_path_style_url>`** — This is not a valid ClickHouse S3 disk configuration option. ClickHouse derives path/virtual-host style from the endpoint URL itself; there is no such config key in the official docs. Removed.
2. **Problematic `<send_metadata>true</send_metadata>`** — While this option exists, it is not used in the official ClickHouse GCS integration guide and is documented to cause server start-up failures in some versions (ClickHouse Issue #30510). Removed.
3. **Missing `<support_batch_delete>false</support_batch_delete>`** — The official ClickHouse GCS guide explicitly requires this because GCS does not support the same batch-delete semantics as AWS S3. Without it, deletes (e.g., during merges and dropping parts) can fail. Added.
4. **Added `<metadata_path>`** — The official GCS example includes a metadata_path entry per disk; added for completeness and to match the documented pattern.
5. **`gsutil iam ch` role shorthand** — Changed `:objectAdmin` to the canonical `:roles/storage.objectAdmin`. The shorthand is accepted by gsutil for legacy compatibility, but the fully-qualified role name is the documented and forward-compatible form.
6. **HMAC access key placeholder** — Adjusted the example placeholder from the typo'd `GOOGHMAAC5...` to a more realistic `GOOG1EXAMPLEACCESSKEY` format. Real GCS HMAC access keys begin with `GOOG`.

## Review Notes
- The `<region>us-central1</region>` setting is preserved; for GCS S3 interop, ClickHouse uses it for SigV4 signing. Some setups omit it, but its presence is harmless.
- The `<max_size>50Gi</max_size>` cache setting is correctly using human-readable form, which ClickHouse cache disk supports (`ki`, `Mi`, `Gi`).
- The `cache_on_write_operations` option is correct (default false; setting true for write-through cache).
- TTL syntax `MODIFY TTL ... TO VOLUME 'cold'` and `ALTER TABLE ... MOVE PARTITION ... TO DISK 'gcs'` are valid ClickHouse SQL.
- The `gcloud storage hmac create` command is valid and current.
- The `gsutil mb -l us-central1` and `gsutil versioning set off` commands are correct.
- Versioning is intentionally disabled because ClickHouse manages object lifecycle directly; this is a sensible default but readers should be aware that disabling versioning removes a recovery safety net.
