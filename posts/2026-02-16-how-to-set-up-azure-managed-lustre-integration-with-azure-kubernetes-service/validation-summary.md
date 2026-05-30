# Validation Summary: How to Set Up Azure Managed Lustre Integration with Azure Kubernetes Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Lustre
- Azure Kubernetes Service
- Kubernetes StorageClass and PersistentVolumeClaim
- Azure Lustre CSI driver
- Azure CLI
- Azure Blob Storage integration
- Azure Monitor

## Sources Consulted
- Azure CLI `az amlfs` reference: https://learn.microsoft.com/en-us/cli/azure/amlfs?view=azure-cli-latest
- Azure CLI `az amlfs import` reference: https://learn.microsoft.com/en-us/cli/azure/amlfs/import?view=azure-cli-latest
- Azure Managed Lustre CSI driver with AKS: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/use-csi-driver-kubernetes
- Azure Managed Lustre ARM template and SKU sizing reference: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/create-file-system-resource-manager
- Azure Managed Lustre export/archive jobs: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/export-with-archive-jobs
- Azure Managed Lustre network security group guidance: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/configure-network-security-group
- Azure Monitor supported metrics for `Microsoft.StorageCache/amlFilesystems`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storagecache-amlfilesystems-metrics
- Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Azure Lustre CSI driver installation docs: https://github.com/kubernetes-sigs/azurelustre-csi-driver/blob/main/docs/install-csi-driver.md
- Azure Lustre CSI driver static provisioning examples: https://github.com/kubernetes-sigs/azurelustre-csi-driver/tree/main/docs/examples

## Issues Found
- The `az amlfs create` example used `--sku-name`, but the current Azure CLI parameter is `--sku`. Updated the command.
- The maintenance window example used `timeOfDay`; the CLI examples use `timeOfDayUtc`. Updated the command.
- Blob import/export steps were included, but the file system creation command did not configure Blob/HSM integration. Added `--hsm-settings` with container and logging container placeholders.
- The SKU sizing text said 16 TiB is the minimum for most SKUs. Official SKU limits vary by SKU, and Premium-250 has an 8 TiB minimum and 8 TiB increment. Updated the explanation.
- The `az amlfs show` query read `mgsAddress` from the top level. The MGS address is exposed under client information, so the query now uses `clientInfo.mgsAddress`.
- The CSI driver install instructions used a Helm repository/chart that is not the current documented install path. Replaced it with the official install script and corrected the pod label used for verification.
- The static storage example used a manually defined PersistentVolume. Microsoft's current AKS static provisioning guidance uses a StorageClass with `fs-name` and `mgs-ip-address` parameters plus a PVC. Updated the manifests and surrounding text.
- The import command used `az amlfs import-job create`, `--amlfs-name`, and `--maximum-bandwidth`. The current CLI uses `az amlfs import create`, `--aml-filesystem-name`, and does not expose `--maximum-bandwidth` for import creation. Updated the command.
- The export command used `az amlfs export-job create`, which is not the current CLI command. Updated the example to use `az amlfs archive` with `--filesystem-path`.
- The Azure Monitor metrics example used `ClientIOPS`, which is not a documented AMLFS metric ID. Replaced it with `ClientReadOps` and `ClientWriteOps`.
- The networking section said the Lustre subnet must not have NSGs attached. Microsoft documents supported NSG configuration for Managed Lustre, so the text now says to configure the documented NSG rules when an NSG is attached.
- The AKS node pool example used `--enable-accelerated-networking`, which is not a current `az aks nodepool add` parameter. Removed the flag and kept the guidance to choose VM sizes that support accelerated networking.
- Added the Ubuntu Linux OS SKU prerequisite and `--os-sku Ubuntu` to align with the Azure Managed Lustre CSI driver requirements for AKS.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI validation was done against official Microsoft Learn CLI reference pages rather than local `az --help`. The throughput comparison table is still simplified; real performance depends on provisioned capacity, SKU, client count, network configuration, VM limits, and workload profile.
