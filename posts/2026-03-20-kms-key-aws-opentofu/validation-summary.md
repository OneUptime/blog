# Validation Summary: How to Create a KMS Key with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS KMS
- AWS IAM policy documents
- Amazon S3 server-side encryption with AWS KMS
- Amazon EBS encryption
- AWS CloudTrail

## Sources Consulted
- AWS provider `aws_kms_key` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS provider `aws_kms_alias` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_alias
- AWS provider `aws_kms_replica_key` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_replica_key
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider `aws_ebs_volume` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- AWS KMS key rotation docs: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS CloudTrail SSE-KMS docs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html
- Amazon EBS encryption requirements: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption-requirements.html
- How Amazon EBS uses AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/services-ebs.html

## Issues Found
- The application-role key policy allowed `kms:Decrypt`, `kms:GenerateDataKey`, and `kms:DescribeKey`, but it omitted permissions needed for the broader "encryption/decryption" claim and common service integrations. I expanded it to include `kms:Encrypt`, `kms:ReEncrypt*`, and `kms:GenerateDataKeyWithoutPlaintext`, and added a separate `kms:CreateGrant` statement scoped with `kms:GrantIsForAWSResource` for AWS service use cases such as EBS.
- The multi-region example referenced aliased providers `aws.us_east` and `aws.eu_west` without defining them. I added the corresponding provider blocks so the snippet is complete.
- The conclusion said to set deletion windows of "at least 30 days" and to "always" enable key rotation for KMS keys. I corrected this because AWS KMS deletion windows are capped at 30 days, and automatic rotation applies only to supported key types such as symmetric customer managed keys with AWS-managed key material.
- The conclusion recommended alias ARNs in other resources as a general rule. I corrected that to note that alias references depend on what the target resource supports; some resources, such as `aws_ebs_volume`, require a key ARN.

## Review Notes
- The examples remain focused snippets and assume related resources such as `aws_iam_role.app` and `aws_s3_bucket.app` already exist.
- AWS KMS now supports custom automatic rotation periods for supported symmetric keys, but the post's use of `enable_key_rotation = true` remains valid and defaults to the standard rotation schedule when no custom period is set.
