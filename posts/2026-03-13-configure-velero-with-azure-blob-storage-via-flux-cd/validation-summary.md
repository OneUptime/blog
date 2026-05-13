# Validation Summary: How to Configure Velero with Azure Blob Storage via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Velero Helm chart
- Velero plugin for Microsoft Azure
- Azure Blob Storage
- Azure Managed Disks snapshots
- Microsoft Entra Workload ID for AKS
- Azure CLI
- Flux CD HelmRelease and Kustomization
- Kubernetes

## Sources Consulted
- Velero plugin for Microsoft Azure README: https://github.com/velero-io/velero-plugin-for-microsoft-azure
- Velero plugin for Microsoft Azure raw README: https://raw.githubusercontent.com/velero-io/velero-plugin-for-microsoft-azure/main/README.md
- Velero backup storage and volume snapshot locations documentation: https://velero.io/docs/v1.15/locations/
- Velero Helm chart values: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/main/charts/velero/values.yaml
- Velero Helm chart 6.7.0 chart metadata and values: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/velero-6.7.0/charts/velero/Chart.yaml and https://raw.githubusercontent.com/vmware-tanzu/helm-charts/velero-6.7.0/charts/velero/values.yaml
- Azure Workload Identity service account labels and annotations: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- AKS Microsoft Entra Workload ID overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure CLI `az storage container` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Azure Storage CLI authorization guidance: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Azure Storage container soft delete overview: https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-container-overview

## Issues Found
- The prerequisites said Velero must already be installed even though the tutorial installs/configures Velero with a Flux HelmRelease. Changed this to require the Velero CLI locally.
- The Azure Blob container and verification commands omitted `--auth-mode login`. Added it to align with current Azure CLI guidance for Microsoft Entra-authenticated storage data operations.
- The managed identity role section described Contributor access to the storage account while assigning `Storage Blob Data Contributor`. Corrected the comment and added the `Reader` role on the storage account, which the Azure Velero plugin documents as required with `useAAD` unless the storage account URI is supplied directly.
- The AKS node resource group was shown as a placeholder in one command and hardcoded placeholder values were used for the AKS OIDC issuer lookup. Added variables for the AKS cluster/resource group and derived the AKS node resource group with `az aks show --query nodeResourceGroup`.
- The Velero BackupStorageLocation config was missing `useAAD: "true"`, which is required for the Azure plugin to use the Azure AD / Workload Identity route for storage access. Added it under the Azure backup storage config.
- The namespace section described the namespace label as required for Workload Identity. Azure Workload Identity requires the label on the pod template, while the service account carries the client ID annotation. Updated the section title and comment to avoid implying that the namespace label performs the webhook mutation.
- The best-practice note said blob soft delete protects against backup container deletion. Blob soft delete protects blobs; container soft delete protects containers. Updated the recommendation to enable both blob and container soft delete.

## Review Notes
- The Helm chart `6.x` line is consistent with the pinned Azure plugin `v1.9.0` because chart 6.7.0 uses Velero 1.13.x and the Azure plugin compatibility matrix maps plugin `v1.9.x` to Velero `v1.13.x`. Newer chart and plugin versions exist, so future refreshes should update both together according to the compatibility matrix.
- The post uses the AKS node resource group for managed disk snapshot permissions, which is correct for typical AKS clusters because Azure managed disks are stored in the generated node resource group.
