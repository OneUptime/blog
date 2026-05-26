# Validation Summary: How to Configure S3 Bucket Encryption in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon S3 server-side encryption
- SSE-S3
- SSE-KMS
- DSSE-KMS
- AWS KMS
- AWS IAM bucket policies
- AWS CLI

## Sources Consulted
- Terraform AWS provider documentation for `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Amazon S3 default bucket encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html
- Amazon S3 SSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Amazon S3 DSSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingDSSEncryption.html
- Amazon S3 Bucket Keys documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- Amazon S3 bucket policy examples for requiring encryption: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS KMS pricing: https://aws.amazon.com/kms/pricing/
- AWS CLI `get-bucket-encryption` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-encryption.html
- AWS CLI `head-object` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html
- AWS CLI `list-objects-v2` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html

## Issues Found
- The post said S3 supports three server-side encryption methods. S3 also supports SSE-C for object requests, while the Terraform default bucket encryption resource covers SSE-S3, SSE-KMS, and DSSE-KMS. Changed the wording to "For bucket default encryption" to make the scope accurate.
- The SSE-KMS option described KMS pricing as a flat "$1/month per key plus $0.03 per 10,000 API calls." AWS KMS pricing distinguishes customer managed key storage charges from AWS managed keys and request charges. Reworded this to avoid overgeneralizing cost behavior.
- The DSSE-KMS Terraform example set `bucket_key_enabled = true`. AWS documentation states that S3 Bucket Keys are not supported for DSSE-KMS. Removed that setting and added a note that Bucket Keys should not be configured for DSSE-KMS.
- The complete production setup reused `data.aws_iam_policy_document.enforce_encryption`, which referenced the earlier `aws_s3_bucket.enforced` example bucket rather than `aws_s3_bucket.production`. Added a production-specific policy document and updated the bucket policy to use it.
- The summary recommended enabling `bucket_key_enabled` with "KMS" generally. Updated it to recommend Bucket Keys for SSE-KMS specifically, since DSSE-KMS does not support S3 Bucket Keys.

## Review Notes
Terraform and AWS CLI were not installed in the local environment, so I could not run `terraform validate` or local `aws --help` checks. The resource arguments, encryption algorithm values, policy condition keys, and CLI commands were checked against official Terraform AWS provider, Amazon S3, AWS KMS, and AWS CLI documentation.
