# Validation Summary: How to Use S3 as a Storage Disk in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, storage configuration, TTL tiering)
- Amazon S3 / S3-compatible object storage (MinIO)
- AWS IAM role-based authentication
- systemd service configuration

## Sources Consulted
- ClickHouse official documentation: S3-backed MergeTree storage — https://clickhouse.com/docs/en/integrations/s3
- ClickHouse official documentation: Storage configuration and tiered storage — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-s3
- ClickHouse official documentation: Using cache for S3 disk — https://clickhouse.com/docs/en/operations/storing-data#using-local-cache
- ClickHouse official documentation: system.disks table — https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse official documentation: system.parts table — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse 22.3 release blog (production-ready S3 disk announcement)
- ClickHouse official documentation: Configuration file substitution (from_env) — https://clickhouse.com/docs/en/operations/configuration-files

## Issues Found

1. **Minimum version was misleading (line 19)**: Changed from "21.6 or later" to "22.3 or later". S3 disk support existed experimentally in earlier versions, but was not production-ready until 22.3 (April 2022). The blog should guide users to a version where the feature is stable.

2. **Caching configuration used deprecated inline approach (lines 43-46, 147-149)**: The post used `<cache_enabled>`, `<cache_path>`, and `<cache_size>` within the S3 disk definition. This was the pre-22.8 approach. Since ClickHouse 22.8, caching should be configured as a separate `<type>cache</type>` disk that wraps the S3 disk, with `<max_size>` (supporting human-readable units like `10Gi`) and `<path>` settings. Updated both the main configuration example and the performance tuning section to use the modern cache disk type approach. Also updated the storage policy to reference the cache disk (`s3_cold_cache`) instead of the raw S3 disk.

3. **IAM role instructions were incomplete (line 67)**: The post stated that omitting `access_key_id` and `secret_access_key` would cause ClickHouse to use the instance metadata service. This is insufficient — the `<use_environment_credentials>true</use_environment_credentials>` setting must also be added to the disk definition. Updated the text to include this requirement.

4. **Performance tuning had incorrect comments and undocumented settings (lines 141-146)**: 
   - The comment for `max_single_part_upload_size` incorrectly described it as "Number of parallel S3 upload threads per insert" — it actually controls the maximum file size for single-part upload (above which multipart upload is used). Fixed the comment.
   - `s3_max_redirects` was described as "Retry on transient S3 errors" — it actually controls the maximum number of HTTP redirects, and is a session-level setting, not a disk XML parameter. Replaced with `retry_attempts` (a documented disk-level setting).
   - `max_connections` is a session-level setting (`s3_max_connections`), not a disk configuration parameter. Replaced with `request_timeout_ms`, which is a documented disk-level setting.

## Review Notes
- The `use_path_style_uri` setting for MinIO is not listed in the official ClickHouse S3 disk parameter documentation, though it likely exists in the source code. Users should verify this setting name against their specific ClickHouse version.
- The `from_env` attribute syntax for reading credentials from environment variables is correct and is a general ClickHouse configuration mechanism.
- The SQL examples (CREATE TABLE, ALTER TABLE TTL, system table queries) are all syntactically correct and use valid column names.
- The storage policy structure (hot/cold volumes with `move_factor`) correctly follows the documented MergeTree tiered storage configuration.
- Since ClickHouse 24.1, an alternative disk type syntax using `<type>object_storage</type>` with `<object_storage_type>s3</object_storage_type>` is available, but the `<type>s3</type>` syntax used in the post remains valid.
