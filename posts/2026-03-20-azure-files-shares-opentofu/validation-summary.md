# Validation Summary: How to Create Azure Files Shares with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Storage and Azure Files
- Azure CLI
- Linux SMB/CIFS mounting
- Kubernetes PersistentVolumes and the Azure Files CSI driver

## Sources Consulted
- AzureRM `azurerm_storage_share` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_share.html.markdown
- AzureRM `azurerm_storage_account` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- Azure CLI `az storage account keys` command reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/keys?view=azure-cli-lts
- Azure Files on Linux mount guidance: https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Azure Files CSI driver static PV guidance for AKS: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-files
- Azure Files guidance for AKS workloads: https://learn.microsoft.com/en-us/azure/storage/files/azure-kubernetes-service-workloads

## Issues Found
- The `azurerm_storage_share` examples used `storage_account_name`, which the current AzureRM provider docs mark as deprecated in favor of `storage_account_id`. I replaced both examples with `storage_account_id = azurerm_storage_account.files.id`.
- The Linux mount example did not create `/mnt/azure-files` before attempting the mount. I added `sudo mkdir -p /mnt/azure-files` so the command works on a fresh system.
- The Kubernetes example used the deprecated in-tree `azureFile` volume source. Current Kubernetes docs mark `azureFile` as deprecated, and current Azure guidance uses the Azure Files CSI driver. I replaced the manifest with a CSI-based `PersistentVolume` example using `file.csi.azure.com`.

## Review Notes
- Azure Files on Linux still supports SMB 3.0, but Microsoft currently recommends SMB 3.1.1 when the client kernel supports it.
- The Kubernetes example assumes the Azure Files CSI driver is installed and that `azure-files-secret` exists in the `default` namespace with the storage account credentials.
