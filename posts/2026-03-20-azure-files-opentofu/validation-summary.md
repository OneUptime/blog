# Validation Summary: How to Configure Azure Files with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Files
- SMB
- NFS
- Azure Private Endpoints
- Azure Private DNS
- Azure File Sync
- Azure RBAC
- Azure Linux Virtual Machines

## Sources Consulted
- AzureRM `azurerm_storage_account` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- AzureRM `azurerm_storage_share` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_share.html.markdown
- AzureRM `azurerm_storage_account_network_rules` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account_network_rules.html.markdown
- AzureRM `azurerm_storage_sync` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_sync.html.markdown
- AzureRM `azurerm_storage_sync_cloud_endpoint` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_sync_cloud_endpoint.html.markdown
- Mount SMB Azure file shares on Linux clients: https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux
- Mount an NFS Azure file share on Linux: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-how-to-mount-nfs-shares
- SMB file shares in Azure Files: https://learn.microsoft.com/en-us/azure/storage/files/files-smb-protocol
- Plan for an Azure Files deployment: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-planning
- Assign share-level permissions for Azure Files: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-assign-share-level-permissions
- Configure network endpoints for accessing Azure file shares: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-endpoints
- Use private endpoints for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Configure Azure File Sync public and private network endpoints: https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-networking-endpoints
- Access SMB Azure file shares by using managed identities with Microsoft Entra ID: https://learn.microsoft.com/en-us/azure/storage/files/files-managed-identities
- Understand Azure Files performance: https://learn.microsoft.com/en-us/azure/storage/files/understand-performance

## Issues Found
- The SMB share example used the deprecated `storage_account_name` argument. I changed both shares to `storage_account_id` to match current AzureRM guidance.
- The Premium SMB share example used `quota = 100` and omitted `access_tier = "Premium"`. For `FileStorage` shares, current AzureRM docs require Premium tier semantics and a Premium-sized provisioned share. I set `access_tier = "Premium"` on both shares and raised the example quotas to valid Premium values.
- The storage account SMB settings allowed only `Kerberos`, but the VM mount example used a storage account key. Microsoft documents that removing `NTLMv2` blocks key-based SMB mounts. I changed the SMB auth methods to allow both `NTLMv2` and `Kerberos`.
- The storage account restricted SMB to `SMB3.1.1`, but the Linux mount example forced `vers=3.0`. I updated the mount example to `vers=3.1.1` so it matches the storage account policy.
- The Linux mount example embedded the storage key directly in `/etc/fstab` and omitted the current Microsoft-recommended credential-file pattern and mount options. I changed it to create `/etc/smbcredentials/<account>.cred` and use the current documented `credentials=...`, `serverino`, `nosharesock`, `actimeo=30`, `mfsymlinks`, `_netdev`, and `nofail` options.
- The RBAC section claimed to grant a VM managed identity access with the standard SMB Share Contributor/Reader roles. Current Azure Files documentation treats managed-identity SMB access as a separate preview flow, and the post was mixing that with general identity-based SMB RBAC. I converted the example to generic Microsoft Entra principal IDs and added the prerequisite note that Azure Files identity-based authentication must be enabled.
- The RBAC assignments were scoped at the storage account, even though the section described file-share access. I changed the scope to `azurerm_storage_share.app_data.rbac_scope_id`, which is the current provider-supported share scope.
- The storage account firewall comment said the configuration restricted access to the private endpoint only, but `bypass = ["AzureServices"]` still permits trusted Azure services such as Azure File Sync. I corrected the wording.
- The Azure File Sync section described the feature too broadly. I updated the wording to reflect that the shown cloud endpoint is for an SMB Azure file share used with Windows Server file shares.
- The post claimed Premium Azure Files delivers “sub-millisecond” latency. Current Microsoft guidance describes Premium/SSD Azure Files as low latency, generally in the single-digit millisecond range for most I/O. I corrected the latency wording in both the code comment and conclusion.

## Review Notes
- Microsoft Entra Kerberos for Azure Files remains a preview capability in current Microsoft documentation, so the post now labels it that way.
- Azure Files managed-identity SMB access is also a separate preview path with different prerequisites and role requirements than the standard share-level SMB Reader/Contributor roles. The post no longer conflates those models.
- The examples are partial snippets and still assume supporting resources and variables exist elsewhere in the configuration.
