# Validation Summary: How to Schedule Automatic Backups in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Amazon S3
- Amazon CloudWatch
- AWS CLI
- MinIO
- Docker
- Cron

## Sources Consulted
- Portainer settings and backup documentation: https://docs.portainer.io/admin/settings/general
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer BE OpenAPI spec used to verify `/api/backup`, `/restore`, and S3 backup endpoints: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer API access token authentication docs: https://docs.portainer.io/2.21/api/access
- Portainer release/upgrade docs noting backup and restore introduction in BE 2.7: https://docs.portainer.io/2.21/start/upgrade
- Portainer Docker Standalone install docs for fresh-instance restore testing workflow: https://docs.portainer.io/start/install/server/docker
- AWS CLI S3 high-level command reference (`aws s3 mb`, `aws s3 ls`, `aws s3 cp`): https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- AWS CloudWatch CLI `put-metric-alarm` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon S3 metrics and dimensions reference (`NumberOfObjects`, `BucketName`, `StorageType`): https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- MinIO container deployment docs: https://min.io/docs/minio/container/operations/install-deploy-manage/deploy-minio-single-node-single-drive.html
- MinIO client settings (`MC_HOST_<alias>`): https://min.io/docs/minio/linux/reference/minio-mc/minio-client-settings.html
- MinIO `mc mb` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-mb.html

## Issues Found
- The prerequisites claimed the feature applied to all Portainer BE 2.x releases. I changed this to a safer requirement of a BE release with S3 backup support because the official docs do not support the broad `2.x or newer` claim.
- The feature list claimed Portainer BE provides AES-specific encryption details and automatic retention cleanup. Portainer’s docs only guarantee password-protected encrypted backups and document retention via external object-storage lifecycle rules, so I corrected both statements.
- The Portainer UI section used an inaccurate toggle label and an incorrect AWS S3 host value. I changed the label to `Schedule automatic backups`, changed the field name to `Cron rule`, and corrected the AWS S3 host guidance to leave the custom host blank.
- The manual backup API example authenticated incorrectly and used the wrong JSON field name. Portainer access tokens are sent with `X-API-Key`, and the backup payload in the official OpenAPI schema uses `Password`, so I fixed both.
- The verification section used an unsupported `--restore-path` Portainer container flag. I replaced it with the documented workflow: start a fresh Portainer instance with an empty data volume and perform restore during the initial setup flow.
- The CloudWatch example was not a valid or accurate alarm for “missing backups”. It was missing required alarm parameters and S3 metric dimensions, and `NumberOfObjects` only tells you whether the bucket is empty. I replaced it with a valid basic sanity-check alarm and clarified its limitation.
- The backup verification note implied every backup would appear as gzip data. I narrowed that statement to unencrypted backups only.

## Review Notes
- Portainer’s current docs note that `Access Key ID` and `Secret Access Key` can be left blank when the AWS SDK resolves credentials from the runtime environment, such as IRSA on EKS. The post keeps the explicit-key example, which is still valid.
- The AWS IAM example creates a policy but does not show attaching it to a user or role. That is technically valid as a policy-creation example, but readers still need credentials that have this policy attached.
- The CloudWatch example is intentionally limited to a bucket-empty sanity check. Verifying that a specific scheduled backup completed usually requires a naming convention plus object-age checks, S3 Inventory/Storage Lens, or a custom metric.
