# Validation Summary: How to Create QLDB Ledgers in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp AWS provider ~> 5.0)
- Amazon QLDB (Quantum Ledger Database)
- AWS KMS
- Amazon Kinesis Data Streams
- AWS IAM
- Amazon S3
- Amazon CloudWatch (alarms / metrics)
- Amazon SNS
- PartiQL (QLDB query language)
- Amazon Ion (QLDB document format)

## Sources Consulted
- Terraform AWS provider `aws_qldb_ledger` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/qldb_ledger.html.markdown
- Terraform AWS provider `aws_qldb_stream` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/qldb_stream.html.markdown
- AWS Service Authorization Reference for QLDB (IAM actions): https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonqldb.html
- AWS QLDB Developer Guide — IAM: https://docs.aws.amazon.com/qldb/latest/developerguide/security_iam_service-with-iam.html
- AWS QLDB Developer Guide — CloudWatch monitoring: https://docs.aws.amazon.com/qldb/latest/developerguide/monitoring-cloudwatch.html
- AWS QLDB end-of-life announcement (July 2024) and AWS guidance to migrate to Aurora PostgreSQL: https://aws.amazon.com/qldb/

## Issues Found

1. **CloudWatch metric name casing was wrong.** The post used `JournalStorage` (PascalCase). Per the AWS QLDB CloudWatch monitoring documentation, the published metric name is `journalStorage` (lowerCamelCase). Fixed in the `aws_cloudwatch_metric_alarm.qldb_storage` block.

2. **No mention that Amazon QLDB has reached end-of-support.** AWS announced on 2024-07-18 that QLDB would reach end-of-support on 2025-07-31. The post is dated 2026-02-23 — well after EOL — yet recommends starting new QLDB projects. Added a one-paragraph note to the introduction directing readers to AWS's recommended migration path (Aurora PostgreSQL) while preserving the rest of the article for users still managing legacy QLDB ledgers during migration.

## Review Notes

- All Terraform resource arguments verified: `aws_qldb_ledger` (`name`, `permissions_mode`, `deletion_protection`, `kms_key`, `tags`) and `aws_qldb_stream` (`ledger_name`, `stream_name`, `role_arn`, `inclusive_start_time`, `kinesis_configuration { aggregation_enabled, stream_arn }`, `tags`) match the official provider schema. The KMS argument is `kms_key` (not `kms_key_id` or `kms_key_arn`).
- All QLDB IAM actions used in the policies are valid per the AWS Service Authorization Reference, including `qldb:PartiQLHistoryFunction`, `qldb:SendCommand`, and the various `qldb:PartiQL*` table/index actions.
- IAM `Resource` patterns are correct: ledger-level actions (e.g. `qldb:SendCommand`) target the ledger ARN, while PartiQL/table actions target `${ledger_arn}/*` (which resolves to table-level ARNs).
- The KMS key policy correctly grants the `qldb.amazonaws.com` service principal `kms:CreateGrant`, `kms:GenerateDataKey*`, `kms:DescribeKey`, `kms:Encrypt`, `kms:Decrypt`, `kms:ReEncrypt*` — these are the permissions QLDB needs for a customer-managed CMK.
- The Kinesis stream `retention_period = 24` (hours) is the AWS-supported minimum and is fine; for production you may want to extend it.
- The `aws_s3_bucket_server_side_encryption_configuration` block uses `sse_algorithm = "aws:kms"` without specifying a `kms_master_key_id`, which means AWS-managed `aws/s3` will be used. This is acceptable, just noting it for readers who expect a customer-managed key.
- The example uses `inclusive_start_time = "2026-01-01T00:00:00Z"` — note this must be in the past relative to apply time; a future timestamp will cause the stream resource to fail validation.
- `permissions_mode` is a required argument on `aws_qldb_ledger`; the post correctly always sets it.
- The `aws_s3_bucket.qldb_exports` configuration would also benefit from `aws_s3_bucket_public_access_block` for production use, but this is outside the scope of correctness review.
