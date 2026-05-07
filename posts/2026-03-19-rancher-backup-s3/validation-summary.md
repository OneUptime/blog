# Validation Summary: How to Back Up Rancher to S3

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Backup Operator
- Rancher Manager
- Kubernetes custom resources
- Amazon S3
- AWS IAM
- AWS KMS
- AWS CLI
- kubectl

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/examples
- rancher/backup-restore-operator README: https://github.com/rancher/backup-restore-operator
- AWS CLI `put-bucket-versioning`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- AWS CLI `put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI `put-bucket-encryption`: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3api/put-bucket-encryption.html
- Amazon S3 endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/s3.html
- Using server-side encryption with AWS KMS keys (SSE-KMS): https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html

## Issues Found
- The post used `resourceSetName: rancher-resource-set`, which is deprecated and removed in newer Rancher backup operator releases. I changed both Backup manifests to `rancher-resource-set-full`, which is the current supported full-backup ResourceSet.
- The IAM policy omitted `s3:PutObjectAcl`, which Rancher documents for S3-backed backups. I added that action and split bucket-level `s3:ListBucket` permissions from object-level permissions so the policy matches the documented access pattern.
- The Backup manifests used `s3.amazonaws.com` while the examples were explicitly targeting `us-east-1`. I changed the endpoint to `s3.us-east-1.amazonaws.com` to align the endpoint with the configured bucket region and Rancher’s documented regional S3 endpoint style.
- The SSE-KMS example did not mention the extra KMS permissions required for uploads and restores. I updated the placeholder to a KMS key ARN and added a note that the Rancher IAM principal also needs `kms:GenerateDataKey` and `kms:Decrypt` access in IAM and the KMS key policy.
- The prerequisite `Rancher v2.5 or later` was too broad for a guide using current Backup Operator conventions. I changed it to `A supported Rancher version` so the post no longer implies the unchanged instructions apply uniformly across archived and current Rancher releases.

## Review Notes
- Because the guide now uses `rancher-resource-set-full`, Rancher backup-level encryption via `encryptionConfigSecretName` is still worth considering if you want the backup contents encrypted before they are written to S3, not only encrypted at rest by S3.
- With S3 versioning enabled, deleting old backups through retention policies leaves noncurrent object versions behind unless separate lifecycle handling is added for them.
