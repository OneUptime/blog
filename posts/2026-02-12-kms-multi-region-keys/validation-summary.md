# Validation Summary: How to Use KMS Multi-Region Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Key Management Service (AWS KMS)
- AWS KMS multi-Region keys
- AWS CLI
- Terraform AWS Provider
- Python boto3
- Amazon S3 Cross-Region Replication with SSE-KMS

## Sources Consulted
- AWS KMS Developer Guide: Multi-Region keys in AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html
- AWS KMS Developer Guide: How multi-Region keys work: https://docs.aws.amazon.com/kms/latest/developerguide/mrk-how-it-works.html
- AWS KMS Developer Guide: Create multi-Region primary keys: https://docs.aws.amazon.com/kms/latest/developerguide/create-primary-keys.html
- AWS KMS API Reference: ReplicateKey: https://docs.aws.amazon.com/kms/latest/APIReference/API_ReplicateKey.html
- AWS KMS API Reference: Decrypt: https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html
- AWS CLI Command Reference: kms create-key: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS CLI Command Reference: kms decrypt: https://docs.aws.amazon.com/cli/latest/reference/kms/decrypt.html
- Amazon S3 User Guide: Replicating encrypted objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- Terraform AWS Provider Registry: aws_kms_replica_key: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_replica_key
- Terraform AWS Provider Registry: aws_s3_bucket_server_side_encryption_configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS KMS Pricing: https://aws.amazon.com/kms/pricing/

## Issues Found
- The post said related multi-Region keys share the same key ID prefix. Updated this to say they share the same key ID and key material, matching AWS KMS documentation.
- The `replicate-key` examples did not specify the source Region. Added `--region us-east-1` so the commands clearly call the primary key's Region.
- The Terraform example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added a `data "aws_caller_identity" "current"` block using the primary provider.
- The decrypt note said `KeyId` is required for multi-Region keys. Updated it to say `KeyId` is optional for symmetric KMS ciphertext but recommended as a best practice.
- The S3 replication section implied that default bucket encryption alone was a complete replication pattern and that S3 automatically uses multi-Region key features. Updated it to clarify that S3 treats multi-Region KMS keys as regional keys for replication, and that the replication rule must opt in to KMS-encrypted object replication, specify the destination KMS key ARN, and include required KMS permissions.
- The post stated a default limit of 10 replicas per primary key. Replaced this with the documented constraint that only one related multi-Region key can exist in each Region, and standard KMS quotas apply to each primary and replica key.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws --help` output.
