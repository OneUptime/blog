# Validation Summary: How to Back Up Rancher to Azure Blob Storage

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Backup Operator
- Kubernetes
- Azure Blob Storage
- Azure CLI
- MinIO

## Sources Consulted
- Rancher Backup, Restore, and Disaster Recovery: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher Backup Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/backup-restore-configuration/examples
- Azure Storage migration target selection: https://learn.microsoft.com/en-us/azure/storage/common/storage-migration-target-selection
- Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure CLI `az storage container` reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Azure CLI `az storage blob` reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest
- Azure CLI `az storage account management-policy` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy?view=azure-cli-latest
- MinIO gateway deprecation notice: https://www.min.io/blog/deprecation-of-the-minio-gateway
- Current MinIO server reference: https://docs.min.io/enterprise/aistor-object-store/reference/aistor-server/

## Issues Found
- The post says Azure Blob Storage can be used through "Azure Blob's S3 compatibility layer." Microsoft documents that Azure Blob Storage does not natively support the S3 API, so that claim is incorrect.
- Rancher documents per-backup storage overrides as S3-compatible or MinIO object stores. The post presents Azure Blob Storage as a supported target even though Rancher does not document it as one.
- The workaround the post depends on is MinIO gateway mode. MinIO announced the gateway deprecation on February 12, 2025 and said it would be removed six months later. Because the post deploys `minio/minio:latest` and uses `gateway azure`, the core procedure is no longer current as of 2026-05-07.
- The Backup manifests use `rancher-resource-set`. Rancher documents that resource set as deprecated and scheduled for removal in Rancher v2.12, with `rancher-resource-set-full` or `rancher-resource-set-basic` as the replacements.
- These are not isolated fixes. Correcting the article would require replacing its central Azure Blob + MinIO gateway approach with a different supported backup target or a different architecture entirely.

## Review Notes
- The Azure CLI snippets for creating the resource group, storage account, container, and lifecycle policy are broadly plausible on their own, but they do not make the overall Rancher backup workflow valid.
- The README was left unchanged because this post is better classified for removal than for narrow technical correction.
