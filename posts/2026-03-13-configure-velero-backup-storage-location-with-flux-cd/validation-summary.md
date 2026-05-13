# Validation Summary: How to Configure Velero Backup Storage Location with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Velero BackupStorageLocation custom resources
- Velero AWS and GCP provider plugins
- Flux CD Kustomization resources
- Kubernetes Secrets and kubectl

## Sources Consulted
- Velero BackupStorageLocation API documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero AWS plugin BackupStorageLocation configuration: https://github.com/velero-io/velero-plugin-for-aws/blob/main/backupstoragelocation.md
- Velero AWS plugin setup and additional BackupStorageLocation documentation: https://github.com/velero-io/velero-plugin-for-aws
- Velero GCP plugin BackupStorageLocation configuration: https://github.com/velero-io/velero-plugin-for-gcp/blob/main/backupstoragelocation.md
- Velero GCP plugin setup and additional BackupStorageLocation documentation: https://github.com/velero-io/velero-plugin-for-gcp
- Velero resource filtering documentation for `--include-namespaces`: https://velero.io/docs/main/resource-filtering/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The introduction implied every BackupStorageLocation specifies a region. This is true for AWS S3-style configuration but not for every provider, so it now says "the region where applicable."
- The AWS example labeled `s3Url` and `publicUrl` as S3 storage-class settings. These are endpoint/download URL settings primarily used for S3-compatible services such as MinIO, so the misleading fields and comment were removed from the AWS S3 example.
- The AWS example suggested adding `kmsKeyId` under an example that already set `serverSideEncryption: AES256`. The comment now explains that for SSE-KMS, `kmsKeyId` is set and Velero automatically uses `aws:kms`.
- The GCS example combined a key-file credential Secret with `config.serviceAccount`, which the GCP plugin documents for Workload Identity use. The `serviceAccount` config was removed so the example matches the credential Secret flow shown in the post.
- The Flux Kustomization used `healthChecks` for a Velero custom resource without custom health logic. Since Velero BackupStorageLocation reports readiness through `status.phase`, a `healthCheckExprs` entry was added to treat `Available` as current and `Unavailable` as failed.

## Review Notes
- The Velero CLI was not installed in the local environment, so CLI flags were verified against official Velero documentation instead of local `velero --help` output.
- Current Velero API documentation still shows short provider names such as `aws` in BackupStorageLocation examples, while current provider plugin examples show fully qualified plugin names such as `velero.io/aws`. The post keeps the short names because they match the Velero API documentation used by many install paths.
