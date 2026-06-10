# Validation Summary: How to Create Warm Storage Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS S3 (Standard, Standard-IA, One Zone-IA, Glacier Instant Retrieval, Glacier Flexible Retrieval, Glacier Deep Archive)
- AWS S3 Lifecycle Configuration
- Azure Cool Blob Storage
- Google Cloud Nearline Storage
- Terraform (AWS provider, `aws_s3_bucket_lifecycle_configuration`)
- PostgreSQL `pg_dump`
- AWS CLI (`aws s3 cp`)
- Fluent Bit (S3 output plugin)
- Velero (BackupStorageLocation, Schedule)
- Python (`boto3` SDK, `concurrent.futures`)
- Prometheus alerting rules
- Mermaid diagrams

## Sources Consulted
- AWS S3 Pricing — https://aws.amazon.com/s3/pricing/
- AWS S3 Storage Classes — https://aws.amazon.com/s3/storage-classes/
- AWS S3 Lifecycle Configuration API reference (valid `StorageClass` values: `STANDARD_IA`, `ONEZONE_IA`, `INTELLIGENT_TIERING`, `GLACIER`, `GLACIER_IR`, `DEEP_ARCHIVE`) — https://docs.aws.amazon.com/AmazonS3/latest/API/API_Transition.html
- Terraform AWS Provider — `aws_s3_bucket_lifecycle_configuration` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS CLI `s3 cp` reference (`--storage-class`, `--tagging`, `--metadata`)
- Azure Blob Storage access tiers documentation
- Google Cloud Storage classes / Nearline SLA documentation
- Velero AWS plugin BackupStorageLocation config options — https://github.com/vmware-tanzu/velero-plugin-for-aws/blob/main/backupstoragelocation.md
- Fluent Bit S3 output plugin documentation — https://docs.fluentbit.io/manual/pipeline/outputs/s3
- boto3 documentation (`download_file`, `head_object`, `get_object` with Range)
- Prometheus alerting rules reference

## Issues Found

1. **Invalid Terraform storage class value `GLACIER_INSTANT_RETRIEVAL`** (two occurrences in the Terraform lifecycle configuration). The AWS S3 API and the Terraform AWS provider only accept `GLACIER_IR` for the Glacier Instant Retrieval class. The `GLACIER_INSTANT_RETRIEVAL` value would cause Terraform plan/apply to fail with a schema validation error. Replaced both occurrences with `GLACIER_IR` to match the JSON lifecycle example earlier in the post and the canonical AWS value.

2. **Incorrect cost figure in the RTO-by-storage-class table** — `S3 Glacier Flexible` "Cost per Restore" was listed as `$10.00` for a 100 GB expedited restore. Expedited Glacier Flexible Retrieval is priced at $0.03 per GB (plus a small per-request fee of $10 per 1,000 requests), so a 100 GB expedited restore is approximately $3.00, not $10.00. The $10 figure appears to have confused the per-request expedited fee with the per-GB data retrieval cost. Updated the value to `$3.00`.

3. **Misleading inline comment in `compare_ia_tiers` example** — the comment read `# Example: 500 GB for 12 months, 2 restores per month` but the actual argument passed (`0.17`) represents roughly 2 restores per *year* (0.17 × 12 ≈ 2). The end-of-line comment already noted `~2 restores/year`, so the leading comment was internally inconsistent. Updated the lead-in comment to `~2 restores per year` and clarified the math (`0.17/month ≈ 2/year`) so the example is consistent.

## Review Notes

- **Velero `storageClass` config field (line ~219)**: The post sets `config.storageClass: STANDARD_IA` on a Velero `BackupStorageLocation`. The official Velero AWS plugin documentation does not list `storageClass` among the supported `config` keys (documented keys include `region`, `s3Url`, `s3ForcePathStyle`, `kmsKeyId`, `serverSideEncryption`, `tagging`, `checksumAlgorithm`, `signatureVersion`, `profile`, etc.). In practice, the conventional way to land Velero backups in Standard-IA is to use an S3 bucket-level lifecycle rule (as shown elsewhere in the post). The post's snippet may be silently ignored by the plugin. Left unchanged because it does not produce incorrect cost/architecture information, but readers should verify against the Velero AWS plugin version they are running.
- **Python `datetime.utcnow()`**: Used in the restore script. Deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. Code still runs but emits a `DeprecationWarning` on modern interpreters. Not changed since it is a stylistic / forward-compatibility concern rather than a correctness issue.
- **Standard-IA availability number**: The post compares `99.9%` for Standard-IA vs `99.99%` for Standard. These are AWS's *designed* availability figures (the *SLA* numbers are 99% and 99.9% respectively). Both are commonly used in marketing material, so left as-is.
- **`s3.download_file` progress callback**: Correct usage — boto3 calls the callback with the number of bytes transferred in the most recent chunk (not cumulative), and the code accumulates correctly with `nonlocal downloaded`.
- **Fluent Bit `content_type` parameter**: Verified as a supported option on the Fluent Bit S3 output plugin.
- **AWS S3 IA minimum object size billing of 128 KB, 30-day minimum storage duration, $0.01/GB retrieval fee**: All confirmed against AWS pricing.
- **Glacier Deep Archive retrieval cost in the table ($2.00 for 100 GB standard retrieval = $0.02/GB)**: Matches AWS published pricing.
- **Glacier Instant Retrieval cost ($3.00 for 100 GB = $0.03/GB)**: Matches AWS published pricing.
