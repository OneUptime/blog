# Validation Summary: How to Set Up S3-Compatible Backup Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- MinIO
- Velero
- AWS S3
- AWS IAM
- AWS CLI
- S3-compatible object storage

## Sources Consulted
- Velero AWS plugin README and compatibility table: https://github.com/velero-io/velero-plugin-for-aws
- Velero install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero file system backup documentation: https://velero.io/docs/main/file-system-backup/
- Velero MinIO quick-start documentation: https://velero.io/docs/main/contributions/minio/
- MinIO Helm chart listing on Artifact Hub: https://artifacthub.io/packages/helm/minio-official/minio
- MinIO container documentation: https://min.io/docs/minio/container/index.html
- MinIO mc encrypt set reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-encrypt-set.html
- MinIO mc replicate add reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-replicate-add.html
- AWS CLI put-bucket-lifecycle-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon S3 Object Lock user guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html

## Issues Found
- The external MinIO Docker examples used `minio/minio` and `minio/mc`. MinIO's current container documentation uses `quay.io/minio/minio`, and the MinIO client image is also available under `quay.io/minio/mc`, so the examples were updated.
- The Velero install examples used `velero/velero-plugin-for-aws:v1.9.0`, which is compatible with older Velero releases. Updated the examples to `v1.14.0`, the latest stable AWS plugin release found during review.
- The monitoring CronJob checked `talos-cluster-backups` while using the in-cluster MinIO endpoint. Updated it to check the MinIO `velero-backups` bucket shown earlier in the guide.
- The monitoring CronJob tried to read `aws-access-key-id` and `aws-secret-access-key` keys from a `velero` secret. The examples in this post use Velero's credentials-file format, so the job now mounts a `cloud-credentials` secret containing a `cloud` key and sets `AWS_SHARED_CREDENTIALS_FILE`.
- The MinIO replication example used non-current `mc replicate add` flags. Updated it to the documented `--remote-bucket` URL form and added `--replicate "delete,delete-marker,existing-objects"`.

## Review Notes
- The guide is technically relevant and implementation-heavy.
- The AWS IAM example is sufficient for object-store-only Velero backups. Environments using AWS EBS volume snapshots also need the EC2 snapshot permissions from the Velero AWS plugin documentation.
- MinIO SSE-S3 requires MinIO to be configured with a supported KMS. The `mc encrypt set` command is valid, but it will fail if the server-side encryption prerequisites are not configured.
