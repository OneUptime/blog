# Validation Summary: How to Secure ClickHouse Backup Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (native BACKUP/RESTORE commands, encrypted disk configuration, system.backups table)
- AWS S3 (bucket policies, Object Lock, server access logging)
- GPG (symmetric encryption for local backups)
- clickhouse-backup (third-party Altinity tool for local backups)

## Sources Consulted
- ClickHouse documentation on encrypted disks: https://clickhouse.com/docs/operations/storing-data
- ClickHouse documentation on BACKUP/RESTORE: https://clickhouse.com/docs/operations/backup/overview
- ClickHouse system.backups / system.backup_log table reference: https://clickhouse.com/docs/operations/system-tables/backup_log
- AWS S3 bucket policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS S3 server access logging documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html

## Issues Found

### 1. Encryption algorithm did not match key size (line 25)
**What was wrong:** The config specified `AES_128_CTR` as the algorithm but the key placeholder described a 32-byte key. AES-128-CTR requires a 16-byte key; a 32-byte key is for AES-256-CTR.
**What was changed:** Changed `<algorithm>AES_128_CTR</algorithm>` to `<algorithm>AES_256_CTR</algorithm>` to match the 32-byte key.
**Why:** A 32-byte key with AES_128_CTR would cause a configuration error in ClickHouse. AES_256_CTR is the correct algorithm for a 32-byte key.

### 2. Invalid `SETTINGS async = false` on BACKUP command (line 42-43)
**What was wrong:** The BACKUP command used `SETTINGS async = false`. `async` is not a valid SETTINGS parameter for the BACKUP command. The BACKUP command is synchronous by default; to run asynchronously, the `ASYNC` keyword is used in the SQL statement itself (not via SETTINGS).
**What was changed:** Removed `SETTINGS async = false` from the BACKUP statement.
**Why:** This setting would cause a query error. Synchronous execution is already the default behavior.

### 3. Invalid `SETTINGS async = false` on RESTORE command (line 93)
**What was wrong:** Same issue as above, applied to the RESTORE command.
**What was changed:** Removed `SETTINGS async = false` from the RESTORE statement. Also updated the comment from "List backup contents" to "Restore to a test table for verification" to better describe the operation.
**Why:** Same reason as above — `async` is not a valid SETTINGS parameter.

### 4. Fabricated `system.backups` columns (lines 109-121)
**What was wrong:** The query selected `file_name`, `file_size`, and `checksum` columns from `system.backups`. These columns do not exist. The actual columns include `id`, `name`, `status`, `num_files`, `total_size`, `uncompressed_size`, `compressed_size`, `start_time`, `end_time`, etc.
**What was changed:** Replaced the query with correct columns (`id`, `name`, `status`, `num_files`, `total_size`, `uncompressed_size`, `compressed_size`). Updated the section title from "Checksums in Backup Metadata" to "Checking Backup Metadata" and rewrote the description to accurately explain that ClickHouse verifies checksums automatically during backup/restore operations rather than exposing per-file checksums via SQL.
**Why:** The original query would fail with "unknown column" errors. The corrected query uses real columns and the updated description accurately reflects how ClickHouse handles backup integrity.

## Review Notes
- The `clickhouse-backup` tool used in the "Local Backup Encryption" section is a third-party tool by Altinity, not part of the official ClickHouse distribution. The post uses it alongside native `BACKUP TABLE` commands without distinguishing between the two. This is not technically wrong (both are commonly used), but readers unfamiliar with the ecosystem could find it confusing.
- The S3 bucket policy example uses a 9-digit AWS account ID (`123456789`) instead of the standard 12-digit format. This is fine as a placeholder but could trip up readers who copy-paste without understanding ARN format.
- S3 Object Lock requires versioning to be enabled on the bucket and must be configured at bucket creation time (or enabled via a separate API call on existing buckets). The post doesn't mention these prerequisites.
- The `<key>` element in the encrypted disk configuration accepts a hex-encoded key string. For AES_256_CTR, this means 64 hex characters representing 32 bytes. The placeholder text "your-32-byte-hex-encryption-key-here" is adequate but could be clearer about the hex encoding requirement.
