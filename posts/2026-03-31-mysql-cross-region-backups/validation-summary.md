# Validation Summary: How to Set Up Cross-Region MySQL Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (mysqldump, Percona XtraBackup)
- AWS S3 (cross-region replication, lifecycle policies, server-side encryption)
- AWS CLI (s3, s3api commands)
- AWS KMS (encryption key management for replicated objects)
- Bash scripting

## Sources Consulted
- AWS CLI `s3api put-bucket-replication` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS S3 Replication Configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS CLI `s3 cp` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS S3 Lifecycle Configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- MySQL `mysqldump` reference: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- Percona XtraBackup documentation: https://docs.percona.com/percona-xtrabackup/

## Issues Found
1. **Missing `Role` field in S3 replication configuration (Approach 2):** The replication configuration JSON was missing the required top-level `Role` field. The `put-bucket-replication` API requires an IAM role ARN that S3 assumes to perform replication. Without this field, the API call would fail with a `MalformedXML` error. Added `"Role": "arn:aws:iam::123456789:role/s3-replication-role"` to the configuration.

2. **Missing `Priority` field in replication rule (Approach 2):** When using `Filter` in S3 replication rules, a `Priority` integer is required per AWS documentation. Without it, the API call may fail or produce unexpected behavior. Added `"Priority": 1` to the rule.

## Review Notes
- S3 Cross-Region Replication requires versioning to be enabled on both the source and destination buckets. The post does not mention this prerequisite. Readers following Approach 2 would need to enable versioning before the replication configuration can be applied.
- The XtraBackup streaming approach (Approach 3) uses `--password=secret` on the command line, which exposes the password in process listings. In production, a `.my.cnf` file or `--login-path` would be more secure. This is acceptable for a tutorial example.
- The checksum verification section uses `md5sum`, which is available on Linux but on macOS the equivalent command is `md5`. Readers on macOS would need to adjust accordingly.
- The `--sse AES256` flag for server-side encryption is correct but uses S3-managed keys (SSE-S3). For higher security requirements, `--sse aws:kms` with a customer-managed key could be preferred.
