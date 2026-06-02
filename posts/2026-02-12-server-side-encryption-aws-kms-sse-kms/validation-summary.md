# Validation Summary: How to Enable Server-Side Encryption with AWS KMS (SSE-KMS)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS Key Management Service (AWS KMS)
- SSE-KMS
- S3 Bucket Keys
- AWS CLI
- Boto3 for Python
- AWS CloudTrail
- IAM and S3 bucket policies

## Sources Consulted
- Amazon S3 User Guide: Using server-side encryption with AWS KMS keys (SSE-KMS): https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Amazon S3 User Guide: Examples of Amazon S3 bucket policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon S3 User Guide: Configuring your bucket to use an S3 Bucket Key with SSE-KMS for new objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-bucket-key.html
- Amazon S3 User Guide: Reducing the cost of SSE-KMS with Amazon S3 Bucket Keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- AWS KMS Developer Guide: Logging AWS KMS API calls with AWS CloudTrail: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- AWS CloudTrail User Guide: Viewing events with CloudTrail event history: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
- AWS KMS Developer Guide: Rotate AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS CLI Command Reference: kms create-key: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS CLI Command Reference: s3api put-bucket-encryption: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- Boto3 S3 Client Reference: put_object: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html
- AWS KMS Pricing: https://aws.amazon.com/kms/pricing/

## Issues Found
- The bucket policy used `StringNotEqualsIfExists` on `s3:x-amz-server-side-encryption-aws-kms-key-id` and also included a separate `s3:x-amz-server-side-encryption` deny condition. Updated the policy to the AWS-documented `ArnNotEqualsIfExists` pattern for requiring a specific KMS key, which also matches the ARN type of the condition value.
- The CloudTrail sample said it looked up decrypt events for one key, but the code only filtered by `EventName`. Updated the sample to parse each returned event and filter on the key ARN or key ID from event resources and KMS event details.
- The key rotation section said customer-managed key material changes annually. Updated the wording to say automatic rotation uses a regular schedule and defaults to yearly, because AWS KMS now supports custom automatic rotation periods for supported customer-managed keys.

## Review Notes
The AWS CLI examples, Boto3 `put_object` parameters, default bucket encryption structure, S3 Bucket Key explanation, CloudTrail/KMS auditing claims, envelope encryption flow, cross-account KMS guidance, and pricing figures were consistent with current AWS documentation. The local environment did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference rather than local `--help` output.
