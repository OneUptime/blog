# Validation Summary: How to Configure SQS Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- AWS KMS (Key Management Service)
- AWS CLI
- Terraform (aws_sqs_queue, aws_kms_key, aws_kms_alias)
- AWS CloudFormation (AWS::SQS::Queue, AWS::KMS::Key, AWS::KMS::Alias)
- AWS Encryption SDK for Python (aws-encryption-sdk)
- AWS Encryption SDK for JavaScript / Node.js (@aws-crypto/client-node)
- boto3 (Python AWS SDK)
- AWS SDK v3 for JavaScript (@aws-sdk/client-sqs, @aws-sdk/client-kms)
- AWS CloudTrail
- AWS CloudWatch (alarms, metrics)
- IAM (policies, permissions, simulate-principal-policy)

## Sources Consulted
- AWS SQS Developer Guide — Key management: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
- AWS SQS Developer Guide — Encryption at rest: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html
- AWS CLI SQS Reference (create-queue, set-queue-attributes): https://docs.aws.amazon.com/cli/latest/reference/sqs/
- Terraform AWS Provider — aws_sqs_queue, aws_kms_key, aws_kms_alias resources
- AWS CloudFormation — AWS::SQS::Queue, AWS::KMS::Key, AWS::KMS::Alias resource reference
- AWS Encryption SDK for Python documentation: https://aws-encryption-sdk-python.readthedocs.io/
- AWS Encryption SDK for JavaScript / @aws-crypto/client-node README on GitHub
- AWS KMS Developer Guide — Monitoring with CloudWatch: https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html
- AWS KMS Condition Keys (kms:ViaService, kms:CallerAccount): https://docs.aws.amazon.com/kms/latest/developerguide/policy-conditions.html
- CloudWatch AWS/Usage metric for API call counts: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Service-Quota-Integration.html
- AWS CloudTrail lookup-events CLI reference

## Issues Found
1. **CloudWatch alarm metric inaccuracy** — The original alarm example specified `Namespace: "AWS/KMS"` with `MetricName: "CallCount"` and a `KeyId` dimension. AWS KMS does not publish a `CallCount` metric to the `AWS/KMS` namespace — the only metric KMS publishes natively is `SecondsUntilKeyMaterialExpiration`. The alarm as written would never trigger because the metric does not exist. Replaced with a working alarm using the `AWS/Usage` namespace (which publishes account-level `CallCount` for API operations with dimensions `Service`, `Type`, `Resource`, `Class`) and added a sentence noting that per-key tracking requires CloudWatch metric filters built from CloudTrail logs.

## Review Notes
- IAM permission split between producer (kms:GenerateDataKey + kms:Decrypt) and consumer (kms:Decrypt only) is correct per AWS SQS documentation. The Decrypt permission on the producer is required because SQS may reuse cached data keys across SendMessage calls within `KmsDataKeyReusePeriodSeconds`.
- `KmsDataKeyReusePeriodSeconds` valid range (60–86400 seconds) and default (300) are correctly reflected throughout the post.
- AWS Encryption SDK Python code uses the v2/v3-style API (`EncryptionSDKClient`, `StrictAwsKmsMasterKeyProvider`, `CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT`) — currently valid and supported. Note for future readers: AWS Encryption SDK v4 introduced the AWS Cryptographic Material Providers Library (MPL) as the recommended approach, though the legacy master key provider API still works.
- Node.js code uses `@aws-crypto/client-node` v3-style API which is current.
- The Python decryption code does not pass `encryption_context` to verify it on decrypt — this is a best-practice gap (not an error). Verifying encryption context on decrypt would defend against ciphertext-swapping more strongly.
- The Terraform `aws_sqs_queue` resource attributes (`kms_master_key_id`, `kms_data_key_reuse_period_seconds`, `message_retention_seconds`, `visibility_timeout_seconds`, `receive_wait_time_seconds`) and the CloudFormation `AWS::SQS::Queue` properties (`KmsMasterKeyId`, `KmsDataKeyReusePeriodSeconds`, `MessageRetentionPeriod`, `VisibilityTimeout`, `ReceiveMessageWaitTimeSeconds`) are all valid and current.
- Cross-account KMS policy correctly uses `kms:ViaService` and `kms:CallerAccount` condition keys; both are valid KMS condition keys.
- `aws iam simulate-principal-policy`, `aws kms describe-key`, and `aws cloudtrail lookup-events` commands and flags are all valid.
