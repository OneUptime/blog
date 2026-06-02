# Validation Summary: How to Configure S3 Bucket Key to Reduce KMS Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Bucket Keys
- AWS KMS
- AWS CLI
- Terraform AWS Provider
- AWS CloudFormation
- Amazon CloudWatch
- AWS Cost Explorer

## Sources Consulted
- Amazon S3 User Guide: Reducing the cost of SSE-KMS with Amazon S3 Bucket Keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- Amazon S3 User Guide: Configuring an S3 Bucket Key at the object level: https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-bucket-key-object.html
- Amazon S3 User Guide: Configuring your bucket to use an S3 Bucket Key with SSE-KMS for new objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-bucket-key.html
- Amazon S3 User Guide: Using server-side encryption with AWS KMS keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- AWS CLI Command Reference: s3api put-bucket-encryption: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- AWS CLI Command Reference: s3api put-object: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html
- AWS CLI Command Reference: s3api copy-object: https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- AWS CLI Command Reference: s3api head-object: https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html
- AWS CloudFormation User Guide: AWS::S3::Bucket ServerSideEncryptionRule: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-serversideencryptionrule.html
- Terraform Registry: aws_s3_bucket_server_side_encryption_configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform Registry: aws_kms_key: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key.html
- AWS KMS Developer Guide: Monitor KMS keys with Amazon CloudWatch: https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html
- AWS KMS Pricing: https://aws.amazon.com/kms/pricing/

## Issues Found
- The post said Bucket Keys reduce KMS requests by 90-99% for most workloads. AWS documents savings as up to 99% and notes that savings depend on requester count, request patterns, and object age. I changed the wording to reflect that workload-dependent behavior.
- The replication note said Bucket Key settings are not replicated and must be configured separately on source and destination buckets. AWS documents that S3 Bucket Keys work with Same-Region Replication and Cross-Region Replication, and that replicas generally preserve the source object's encryption settings. I corrected the note.
- The CloudWatch monitoring command used the outdated/non-matching KMS metric name `RequestCount` with `KeyId`. AWS KMS documents `SuccessfulRequest` with `KeyArn` and `Operation` dimensions for key-level cryptographic request monitoring. I updated the command accordingly.

## Review Notes
- The AWS CLI, Terraform, and CloudFormation Bucket Key configuration examples are syntactically valid for general purpose S3 buckets.
- The cost examples use AWS KMS request pricing of $0.03 per 10,000 requests and are reasonable illustrative calculations, but actual bills can vary by free tier usage, Region, key type, and workload request patterns.
- S3 Bucket Keys are not supported for DSSE-KMS; the post focuses on SSE-KMS, so this omission is not a technical error.
