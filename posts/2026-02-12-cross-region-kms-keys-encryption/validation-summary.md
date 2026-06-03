# Validation Summary: How to Set Up Cross-Region KMS Keys for Encryption

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS KMS multi-Region keys
- AWS CLI
- Boto3 for Python
- Amazon S3 Cross-Region Replication with SSE-KMS
- Amazon DynamoDB encryption at rest and global tables
- Terraform AWS provider KMS resources
- Amazon CloudWatch KMS metrics

## Sources Consulted
- AWS KMS Developer Guide: Multi-Region keys in AWS KMS - https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html
- AWS KMS Developer Guide: How multi-Region keys work - https://docs.aws.amazon.com/kms/latest/developerguide/mrk-how-it-works.html
- AWS KMS Developer Guide: Create multi-Region replica keys - https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-replicate.html
- AWS CLI Command Reference: kms create-key - https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS CLI Command Reference: kms replicate-key - https://docs.aws.amazon.com/cli/latest/reference/kms/replicate-key.html
- AWS CLI Command Reference: kms update-primary-region - https://docs.aws.amazon.com/cli/latest/reference/kms/update-primary-region.html
- Boto3 KMS client encrypt/decrypt documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/kms/client/encrypt.html and https://docs.aws.amazon.com/boto3/latest/reference/services/kms/client/decrypt.html
- Amazon S3 User Guide: Replicating encrypted objects - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- AWS CLI Command Reference: dynamodb create-table - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- Amazon DynamoDB Developer Guide: Global tables security and AWS KMS - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-security.html
- Terraform Registry: aws_kms_replica_key - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_replica_key
- AWS KMS Developer Guide: Monitor KMS keys with Amazon CloudWatch - https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html

## Issues Found
- The `aws kms replicate-key` examples used a key ID without specifying the current primary key's Region. Added `--region us-east-1` so the CLI call is sent to the primary key's Region and does not depend on the user's configured default Region.
- The replica creation flow did not mention that new replica keys enter a transient `Creating` state and cannot yet be used for cryptographic operations. Added a short wait note before using replicas for encryption or decryption.
- The CloudWatch monitoring example used `NumberOfEncryptRequests` with a `KeyId` dimension. Current AWS KMS key-level API usage metrics use `SuccessfulRequest` with `KeyArn` and `Operation` dimensions. Updated the command accordingly.
- The `aws kms update-primary-region` example used a key ID without specifying the current primary key's Region. Added `--region us-east-1` for consistency with the AWS CLI operation requirement that the key ID identify the current primary key.

## Review Notes
The AWS CLI is not installed in this workspace, so local `aws ... help` validation was not possible. Commands and examples were checked against current official AWS CLI, AWS service, Boto3, and Terraform provider documentation instead.
