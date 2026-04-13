# Validation Summary: How to Back Up MongoDB to AWS S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`mongodump`, `mongorestore`)
- AWS S3 (storage classes, lifecycle policies, server-side encryption)
- AWS CLI (`aws s3 cp`, `aws s3api put-bucket-lifecycle-configuration`, `aws s3 ls`)
- AWS IAM (least-privilege policies)
- Bash scripting
- Cron (`/etc/cron.d/` system cron format)

## Sources Consulted
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- AWS CLI `s3 cp` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- AWS S3 lifecycle configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- AWS IAM S3 actions reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html
- AWS S3 durability claims: https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html
- cron(5) man page for `/etc/cron.d/` file format

## Issues Found

1. **Prerequisites listed wrong IAM permission**: The prerequisites section listed `s3:DeleteObject` as a required permission, but no script in the post uses that action. The IAM policy section correctly included `s3:ListBucket` (required by the `aws s3 ls` command in the monitoring section). Changed the prerequisites to list `s3:ListBucket` instead of `s3:DeleteObject` so the two sections are consistent.

2. **Cron entry used unsupported line continuations**: The cron job example used backslash (`\`) line continuations across multiple lines. Cron does not support multi-line entries -- each entry must be a single line. The multi-line version would have been parsed as separate (broken) lines, causing the job to fail silently. Collapsed the entry to a single line.

## Review Notes
- The IAM policy combines bucket-level (`arn:aws:s3:::my-mongodb-backups`) and object-level (`arn:aws:s3:::my-mongodb-backups/backups/*`) resources in a single statement. This works because AWS evaluates each action against each resource independently, but splitting into two statements (one for `s3:ListBucket` on the bucket ARN, one for `s3:PutObject`/`s3:GetObject` on the object ARN) would be stricter least-privilege. This is a common and functional pattern, so it was left as-is.
- The lifecycle policy uses `GLACIER` as the storage class. AWS has introduced the name `GLACIER_FLEXIBLE_RETRIEVAL` in newer documentation, but `GLACIER` remains valid in the S3 API and CLI.
- The backup script uploads with `--storage-class STANDARD_IA`, which has a 30-day minimum storage charge. Since the lifecycle transitions to Glacier at 30 days, this aligns correctly and avoids early deletion fees.
- The `--drop` flag on `mongorestore` drops existing collections before restoring. The post does not warn that this is destructive, but it is standard practice for a full restore and the flag is correct.
