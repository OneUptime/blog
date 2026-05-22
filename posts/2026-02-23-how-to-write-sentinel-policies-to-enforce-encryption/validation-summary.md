# Validation Summary: How to Write Sentinel Policies to Enforce Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform / HCP Terraform policy enforcement
- Terraform AWS Provider
- AWS S3 encryption
- AWS EBS and EC2 block device encryption
- AWS RDS and Aurora encryption
- AWS Elastic Load Balancing listener TLS policies
- AWS Kinesis Data Firehose encryption
- AWS SQS encryption
- AWS EFS and Redshift encryption
- AWS KMS customer-managed keys

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel `test` command reference: https://developer.hashicorp.com/sentinel/docs/commands/test
- HCP Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HCP Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS Provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS Provider `aws_kinesis_firehose_delivery_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- Terraform AWS Provider `aws_sqs_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Amazon S3 default encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html
- AWS S3 DSSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-dsse-encryption.html

## Issues Found
- The policy snippets were labeled as `python` code blocks even though they are Sentinel policies. Changed the code fence language to `sentinel`.
- The S3 introduction implied S3 encryption itself is commonly absent. Updated the wording to reflect that S3 has baseline SSE-S3 by default, while explicit encryption requirements and KMS choices still need policy enforcement.
- The first S3 example comment said it required encryption on all buckets, but the example only checks that an S3 encryption configuration exists when buckets are created. Adjusted the comment to match the actual behavior.
- The S3 algorithm allowlist omitted `aws:kms:dsse`, which is a valid Terraform AWS Provider value for S3 default encryption. Added it to the allowed algorithms.
- The EBS example claimed to cover inline EC2 EBS blocks but only checked `root_block_device`. Added validation for `ebs_block_device` entries.
- The production RDS KMS check only required customer-managed KMS keys for `aws_db_instance`, not `aws_rds_cluster`. Added the same check for clusters.
- The comprehensive policy treated any non-null nested block as encrypted, which would pass a Firehose `server_side_encryption` block with `enabled = false`. Added an explicit Firehose `enabled` check.
- The comprehensive policy only accepted `sqs_managed_sse_enabled` for SQS, even though SQS can also use SSE-KMS via `kms_master_key_id`. Added support for either encryption option.
- The KMS enforcement policy skipped S3 encryption configurations entirely. Added validation that S3 default encryption uses `aws:kms` or `aws:kms:dsse` and specifies `kms_master_key_id`.

## Review Notes
The examples are still illustrative Sentinel snippets rather than a complete production policy library. The first S3 example checks for at least one encryption configuration when buckets are created; a stricter production policy should correlate each bucket to its matching `aws_s3_bucket_server_side_encryption_configuration`, including cases where bucket names are computed or encryption is managed in a separate state. The local environment did not have the `sentinel` CLI installed, so syntax was reviewed against documentation but not executed with `sentinel test`.
