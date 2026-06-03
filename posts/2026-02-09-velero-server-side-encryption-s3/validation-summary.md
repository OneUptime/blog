# Validation Summary: How to Configure Velero Server-Side Encryption for Backup Data in S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero AWS plugin
- Amazon S3 server-side encryption
- AWS KMS
- IAM and IRSA
- AWS CLI
- CloudTrail
- CloudWatch

## Sources Consulted
- Velero AWS plugin README: https://github.com/velero-io/velero-plugin-for-aws
- Velero AWS plugin BackupStorageLocation parameters: https://raw.githubusercontent.com/velero-io/velero-plugin-for-aws/main/backupstoragelocation.md
- Amazon S3 SSE-S3 documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- Amazon S3 SSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-kms-encryption.html
- AWS KMS CloudWatch monitoring documentation: https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html
- AWS KMS CloudTrail logging documentation: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- AWS CloudTrail management events documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-events-with-cloudtrail.html
- AWS CLI CloudWatch put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The SSE-S3 explanation implied that enabling SSE-S3 is required before S3 encrypts new objects. AWS S3 has applied SSE-S3 by default to all new object uploads since January 5, 2023, so I updated the text to describe explicit bucket default encryption as optional.
- The cross-account KMS policy only granted `kms:Decrypt` and `kms:DescribeKey`. A Velero role that writes SSE-KMS encrypted backups through S3 also needs write-side KMS permissions such as `kms:Encrypt` and `kms:GenerateDataKey`, so I added them and clarified the read/write distinction.
- The CloudWatch Logs Insights example used an assumed `/aws/kms/velero-backups` log group. KMS API usage is observed through CloudTrail events, so I changed the example to assume a CloudTrail-delivered log group and filter on `eventSource = "kms.amazonaws.com"`.
- The CloudWatch alarm example used a Kubernetes ConfigMap and the nonexistent AWS/KMS `UserErrorCount` metric. I replaced it with an `aws cloudwatch put-metric-alarm` example using the documented AWS/KMS `SuccessfulRequest` metric and its `KeyArn` and `Operation` dimensions.
- The CloudTrail event selector tried to add `AWS::KMS::Key` as a data resource. KMS events are CloudTrail management events, and AWS documents excluding or including KMS through management event selectors, so I removed the invalid data resource selector.
- The troubleshooting note said `kms:Decrypt` was needed on "all key versions" after rotation. AWS KMS automatic rotation keeps prior key material associated with the same KMS key, so I changed the advice to check `kms:Decrypt` on the key and ensure the key is not disabled or pending deletion.

## Review Notes
- The Velero AWS plugin documents `serverSideEncryption`, `kmsKeyId`, `customerKeyEncryptionFile`, and `customerKeyEncryptionSecret` as valid BackupStorageLocation configuration keys.
- The article uses `provider: aws`; the current Velero AWS plugin sample uses `provider: velero.io/aws`, but `aws` is still common in Velero installation examples. Future cleanup could standardize examples on the current plugin name if the surrounding blog conventions do the same.
