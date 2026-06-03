# Validation Summary: How to Enable SNS Message Encryption with KMS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon SNS
- AWS KMS
- AWS CLI
- Boto3 / Python
- AWS CDK / TypeScript
- Amazon CloudWatch

## Sources Consulted
- Amazon SNS Developer Guide: Securing Amazon SNS data with server-side encryption - https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html
- Amazon SNS Developer Guide: Setting up Amazon SNS topic encryption with server-side encryption - https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic.html
- Amazon SNS Developer Guide: Managing Amazon SNS encryption keys and costs - https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html
- AWS CLI Command Reference: sns set-topic-attributes - https://docs.aws.amazon.com/cli/latest/reference/sns/set-topic-attributes.html
- AWS CLI Command Reference: sns create-topic - https://docs.aws.amazon.com/cli/latest/reference/sns/create-topic.html
- AWS CDK API Reference: aws-cdk-lib.aws_sns.Topic - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html
- AWS KMS Developer Guide: Monitor KMS keys with Amazon CloudWatch - https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html

## Issues Found
- The post said the KMS key policy needs to allow subscribers to decrypt SNS messages. AWS documents that SNS decrypts messages before delivery and that enabling SSE does not change how subscribers consume messages. I changed this to explain that subscribers do not decrypt SNS topic messages themselves, while publishers and AWS services that publish to the topic need KMS permissions.
- The key policy examples used only `kms:GenerateDataKey`. AWS SNS key-management guidance uses `kms:GenerateDataKey*` with `kms:Decrypt` for publishers and AWS service event sources. I updated the JSON, Python, and CDK examples accordingly.
- The CDK section claimed CDK automatically handles the KMS key policy when using `masterKey`. The CDK `masterKey` property sets the topic encryption key, but customer-managed keys still need appropriate KMS permissions for SNS and publishers. I updated the explanation and added an explicit `addToResourcePolicy` example for the SNS service principal.
- The cross-account section granted decrypt access to a subscriber account. Since SNS decrypts before delivery, that was misleading for topic SSE. I changed the example to grant KMS usage to a cross-account publisher instead.
- The CloudWatch alarm example used an `AccessDeniedCount` metric with a `KeyId` dimension. AWS KMS CloudWatch metrics list `SuccessfulRequest` with `KeyArn` and `Operation` dimensions, not `AccessDeniedCount`. I replaced the example with a valid KMS usage alarm for decrypt requests.

## Review Notes
The AWS CLI and SDK shapes used for SNS topic encryption (`KmsMasterKeyId` via `CreateTopic` and `SetTopicAttributes`) are current. For production, the KMS key policies should usually include `aws:SourceArn`, `aws:SourceAccount`, or encryption-context conditions where supported to reduce confused-deputy risk. KMS access-denied troubleshooting is better handled through CloudTrail/EventBridge patterns rather than a direct AWS/KMS `AccessDeniedCount` metric.
