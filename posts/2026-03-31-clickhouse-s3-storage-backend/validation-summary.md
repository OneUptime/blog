# Validation Summary: How to Use S3 as a Storage Backend in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, storage_configuration, S3 disk type, cache disk type)
- Amazon S3 (object storage, IAM policies, instance profiles)
- MinIO (S3-compatible object storage)
- AWS CLI (s3 mb, s3api put-public-access-block)

## Sources Consulted
- ClickHouse official docs — MergeTree S3 storage: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-s3
- ClickHouse official docs — Storing data on external storage: https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse official docs — system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official docs — system.metrics and system.events: https://clickhouse.com/docs/en/operations/system-tables/metrics
- AWS docs — S3 path-style vs virtual-hosted-style URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html
- AWS docs — IAM policy for S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html

## Issues Found

1. **"Parquet-like data part files" (Introduction)**: The post incorrectly stated ClickHouse reads "Parquet-like data part files" from S3. ClickHouse stores and reads data in its native MergeTree format (`.bin`, `.mrk3`, `checksums.txt`, `primary.idx`, etc.), not Parquet. Changed to "native MergeTree data part files." The post's own architecture diagram already correctly showed `.bin` and `.mrk3` files.

2. **`use_path_style_url=false` with path-style endpoint URL (Step 3)**: The endpoint URL `https://s3.amazonaws.com/my-clickhouse-data/data/` is in path-style format, but `use_path_style_url` was set to `false` (virtual-hosted style). This is contradictory. Additionally, `use_path_style_url` is not well-documented in official ClickHouse docs — ClickHouse auto-detects the URL style from the endpoint format. Removed the `use_path_style_url` setting from the main S3 disk config. (It is correctly retained as `true` in the MinIO section, where path-style is typically required.)

3. **`upload_part_size_multiply_factor` in disk XML (Step 3)**: This is a query/server-level setting (`s3_upload_part_size_multiply_factor`), not a disk-level XML configuration parameter. Placing it inside the `<s3>` disk definition is incorrect. Removed the setting and its comment from the disk configuration.

4. **S3 monitoring query (Monitoring section)**: The original query `WHERE metric LIKE 'S3%'` would miss many S3-related metrics that are prefixed with `Disk` (e.g., `DiskS3GetObject`, `DiskS3PutObject`). Changed the pattern to `LIKE '%S3%'`. Also added a second query against `system.events`, which contains the cumulative S3 operation counters (request counts, bytes transferred, latencies) that are most useful for monitoring.

## Review Notes
- The `<send_metadata>true</send_metadata>` setting is valid but can occasionally cause startup issues (ClickHouse GitHub issue #30510). The post does not mention this caveat. Not changed since it is a valid setting, but future updates could add a note.
- The IAM policy is correct and includes the minimum required permissions. For production use, `s3:AbortMultipartUpload` and `s3:ListMultipartUploadParts` could also be useful to avoid orphaned multipart uploads, but the current set is functional.
- The `use_environment_credentials` section for instance profiles is correct. Note that ClickHouse can also use the EC2 instance metadata service (IMDS) automatically when no credentials are configured, which is an alternative approach not mentioned.
- The `active = 1` filter in the system.parts query is correct (`active` is a UInt8 column).
