# Validation Summary: How to Set Up AKS Backup and Restore Using Velero with Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes
- Velero
- Velero plugin for Microsoft Azure
- Azure Blob Storage
- Azure Managed Disks and snapshots
- Azure CLI

## Sources Consulted
- Velero v1.18 Basic Install documentation: https://velero.io/docs/v1.18/basic-install/
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 Supported Providers documentation: https://velero.io/docs/v1.18/supported-providers/
- Velero plugin for Microsoft Azure README: https://github.com/velero-io/velero-plugin-for-microsoft-azure
- Velero plugin for Microsoft Azure BackupStorageLocation parameters: https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/backupstoragelocation.md
- Velero plugin for Microsoft Azure VolumeSnapshotLocation parameters: https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/volumesnapshotlocation.md
- Azure CLI `az ad sp create-for-rbac` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp

## Issues Found
- The architecture section said Velero takes persistent volume snapshots using the Azure Disk CSI snapshot API. The install shown uses the Azure provider plugin's Azure Managed Disk snapshotter, not Velero CSI snapshot support, so the wording was corrected.
- The service principal command used `az ad sp create-for-rbac --scope`, but the Azure CLI parameter is `--scopes`. The command was corrected.
- The post described the service principal roles as "minimum required roles" while assigning broad built-in roles. The wording was corrected to avoid implying least privilege.
- The Azure Blob Storage access setup granted `Storage Blob Data Contributor` but did not configure Velero to use Azure AD authentication or grant Reader access to read storage account properties. Added the `Reader` role assignment and `useAAD=true` in the Velero backup location configuration.
- The Velero and Azure plugin versions were outdated. Updated the Linux download example to Velero v1.18.0 and the Azure plugin image to v1.14.0, matching current Velero/plugin compatibility.
- The persistent volume section used `backup.velero.io/backup-volumes` as if it opted a pod into snapshots. That annotation opts volumes into file-system backup. Changed it to `backup.velero.io/backup-volumes-excludes`, which opts the volume out of file-system backup so Velero can attempt snapshot backup when a compatible snapshot location is configured.
- The disaster recovery install command omitted `--use-node-agent`, which is needed to restore file-system backups created by the original installation. Added it and updated the plugin/AAD configuration there as well.

## Review Notes
The post now uses supported Velero flags and current Azure plugin configuration. For a production hardening pass, a future update could replace the broad `Contributor` role assignments with a custom least-privilege Azure role from the Velero Azure plugin documentation.
