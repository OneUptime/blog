# Validation Summary: How to Configure ClickHouse S3 Disk Storage

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (S3 disk storage configuration)
- Amazon S3 (object storage backend)
- S3-compatible storage (MinIO, Google Cloud Storage)
- ClickHouse storage policies and tiered storage
- ClickHouse TTL-based data movement

## Sources Consulted
- ClickHouse official documentation — Storing Data on External Disks: https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse official documentation — MergeTree engine (storage policies, TTL, move_factor): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse S3 Integration Guide: https://clickhouse.com/docs/en/integrations/s3
- Altinity Knowledge Base — S3 Disk Configuration: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-s3-object-storage/s3disk/

## Issues Found

### 1. Invalid inline cache parameters on S3 disk (two occurrences)
**What was wrong:** The S3 disk configurations used `cache_enabled`, `cache_path`, and `cache_max_size` as inline parameters directly on the S3 disk definition. These are not valid S3 disk parameters. Since ClickHouse 22.8, caching must be configured as a separate disk of type `cache` that wraps the S3 disk.

**What was changed:** Replaced the inline cache parameters with a separate `<s3_cold_cache>` disk definition using `<type>cache</type>`, referencing the S3 disk via `<disk>s3_cold</disk>`. Updated both the standalone S3 disk example and the tiered storage policy example. In the tiered policy, the cold volume now references `s3_cold_cache` instead of the raw `s3_cold` disk so that reads benefit from the local cache.

### 2. Misleading XML comment in performance tuning section
**What was wrong:** The comment `<!-- Number of parallel upload threads -->` was placed above `<max_single_part_upload_size>`, which controls the maximum size (in bytes) for a single-part upload before multipart upload kicks in — it has nothing to do with thread count.

**What was changed:** Updated the comment to `<!-- Maximum size for a single-part (non-multipart) upload -->`.

### 3. Invalid `max_upload_part_size` parameter
**What was wrong:** `max_upload_part_size` is not a valid ClickHouse S3 disk configuration parameter. The valid parameters for controlling multipart upload sizing are `min_upload_part_size` and `upload_part_size_multiply_factor`.

**What was changed:** Replaced `<max_upload_part_size>67108864</max_upload_part_size>` with `<upload_part_size_multiply_factor>2</upload_part_size_multiply_factor>` and updated the associated comment from "Multipart upload threshold" to "Multipart upload part sizing".

### 4. Summary referenced invalid parameter
**What was wrong:** The summary paragraph mentioned enabling caching with `cache_enabled`, which is not a valid parameter.

**What was changed:** Updated to reference the separate `cache` disk type approach instead.

## Review Notes
- The `use_path_style_url` parameter shown in the MinIO example is not documented in the current official ClickHouse documentation. It may work in practice, but users should verify against their ClickHouse version. An alternative approach is to rely on the endpoint URL format itself (path-style URLs are used naturally with MinIO endpoints like `http://host:9000/bucket/`).
- The `max_single_read_retries` parameter in the performance tuning section appears in the ClickHouse source code, though the official docs page lists the similar parameter as `single_read_retries`. Both names may work depending on the version.
- The post does not specify a minimum ClickHouse version. The separate `cache` disk type requires ClickHouse 22.8 or later. The `s3` disk type itself has been available since earlier versions.
- ClickHouse 24.1+ introduced a newer unified `object_storage` disk type (`<type>object_storage</type>` with `<object_storage_type>s3</object_storage_type>`), which is not mentioned in the post. The `s3` type remains valid but the newer approach may be preferred for new deployments.
