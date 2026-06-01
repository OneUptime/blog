# Validation Summary: How to Configure Azure Backup for Azure Kubernetes Service Persistent Volumes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Backup for AKS
- Azure Kubernetes Service
- Kubernetes persistent volumes and CSI snapshots
- Azure Disk and Azure SMB Files persistent volumes
- Azure Backup vaults
- Azure CLI extensions: dataprotection and k8s-extension
- AKS Trusted Access
- Azure RBAC and managed identities

## Sources Consulted
- Microsoft Learn: What is Azure Kubernetes Service backup? https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-backup-overview
- Microsoft Learn: Prerequisites for Azure Kubernetes Service backup using Azure Backup https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-cluster-backup-concept
- Microsoft Learn: Back up Azure Kubernetes Service by using Azure Backup https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-cluster-backup
- Microsoft Learn: Back up Azure Kubernetes Service using Azure CLI https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-cluster-backup-using-cli
- Microsoft Learn: Quickstart - Configure vaulted backup for AKS using Azure CLI https://learn.microsoft.com/en-us/azure/backup/quick-kubernetes-backup-cli
- Microsoft Learn: Restore Azure Kubernetes Service using Azure Backup https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-cluster-restore
- Microsoft Learn: Azure Kubernetes Service backup support matrix https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-cluster-backup-support-matrix
- Microsoft Learn Azure CLI reference: az k8s-extension https://learn.microsoft.com/en-us/cli/azure/k8s-extension
- Microsoft Learn Azure CLI reference: az dataprotection backup-vault https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-vault
- Microsoft Learn Azure CLI reference: az dataprotection backup-policy https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-policy
- Microsoft Learn Azure CLI reference: az dataprotection backup-policy retention-rule https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-policy/retention-rule
- Microsoft Learn Azure CLI reference: az dataprotection backup-instance https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-instance
- Microsoft Learn Azure CLI reference: az dataprotection backup-instance restore https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-instance/restore
- Microsoft Learn: Get secure resource access to AKS using Trusted Access https://learn.microsoft.com/en-us/azure/aks/trusted-access-feature

## Issues Found
- The post used the obsolete/incorrect `TrustedAccessPreview` feature flag flow. Replaced it with registration of the required resource providers: `Microsoft.KubernetesConfiguration`, `Microsoft.DataProtection`, and `Microsoft.ContainerService`.
- The post used `az aks extension create/show`, but current documentation uses `az k8s-extension create/show` with `--cluster-type managedClusters`. Updated the install and verification commands.
- The post assigned `Storage Blob Data Contributor` on the storage account to the Backup vault identity. Current AKS backup documentation requires that role for the Backup extension identity. Updated the commands to read `aksAssignedIdentity.principalId`.
- The post did not enable AKS Trusted Access between the Backup vault and AKS cluster. Added the documented `az aks trustedaccess rolebinding create` command with the AKS backup operator role.
- The post manually authored backup policy and backup instance JSON bodies. Replaced them with documented Azure CLI generated templates and `initialize` commands to avoid invalid or stale schemas.
- The post used incomplete snapshot permission setup. Added validation and `update-msi-permissions` commands so Azure CLI assigns required Backup vault and AKS managed identity permissions for backup.
- The on-demand backup and restore examples used unsupported or outdated parameter shapes. Updated them to use resource IDs for on-demand backup and `restore initialize-for-data-recovery` plus `--restore-request-object` for restore.
- The post implied the CLI workflow backs up Azure Files PVs. Microsoft documentation currently says Azure Files PV backup is supported, but Azure Files volume selection is available through the Azure portal. Scoped the CLI workflow to Azure Disk PVs and added Azure Files caveats.
- The post listed AKS version 1.22 as the minimum. Updated it to 1.21.1, matching Microsoft prerequisites for CSI snapshot support.
- The architecture diagram implied PV data and Kubernetes resources are stored directly in the Backup vault. Updated it to distinguish Azure Disk snapshots, Azure Files snapshots, blob container metadata, and the Backup vault control plane.

## Review Notes
Azure CLI is not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages and AKS Backup documentation rather than local `az --help` output.
