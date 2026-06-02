# Validation Summary: How to Create KMS Keys with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Key Management Service (KMS)
- AWS Cloud Development Kit (CDK) v2
- TypeScript
- AWS Identity and Access Management (IAM)
- Amazon S3, SQS, SNS, and DynamoDB encryption
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- AWS CDK v2 `aws_kms.KeyProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.KeyProps.html
- AWS CDK v2 `aws_kms.Key` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.Key.html
- AWS CDK v2 `aws_kms.KeyGrants` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.KeyGrants.html
- AWS CDK v2 `aws_s3.BucketProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_s3/BucketProps.html
- AWS CDK v2 `aws_sqs.Queue` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS CloudWatch monitoring documentation: https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html
- AWS KMS cross-account key access documentation: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS KMS condition key documentation for `kms:GrantIsForAWSResource`: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- AWS KMS pricing page: https://aws.amazon.com/kms/pricing/
- OneUptime linked Secrets Manager post URL, verified reachable: https://oneuptime.com/blog/post/2026-02-12-secrets-manager-secrets-cdk/view

## Issues Found
- The CloudWatch alarm used a non-existent AWS KMS metric name, `NumberOfDecryptAPICalls`, and filtered by `KeyId`. AWS KMS documents the cryptographic operation counter as `SuccessfulRequest` with `KeyArn` and `Operation` dimensions, so the example now uses `SuccessfulRequest`, `KeyArn: encryptionKey.keyArn`, and `Operation: 'Decrypt'`.
- The cross-account section implied that adding the external account to the key policy was sufficient by itself. AWS KMS requires both the key policy in the key-owning account and IAM policies in the external account, so a sentence was added to state that the external account must delegate the permissions to its users or roles.
- The wrap-up said to always enable key rotation, but asymmetric KMS keys do not support automatic rotation. The wording now says to enable rotation where supported.
- The wrap-up stated only that customer managed keys cost `$1/month each`. AWS KMS pricing now also charges for the first and second automatic or on-demand rotations of retained key material, so the wording was updated to describe monthly storage and rotation-related charges without hard-coding an incomplete price summary.

## Review Notes
The CDK construct property names and examples for KMS keys, aliases, grant methods, S3, SQS, SNS, and DynamoDB matched current AWS CDK v2 documentation. The Lambda example uses `NODEJS_20_X`, which remains a valid CDK Lambda runtime, but future posts should periodically re-check Lambda runtime support dates.
