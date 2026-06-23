# Validation Summary: How to Run Local PowerShell Scripts with Terraform VM Extension

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Virtual Machines
- Azure Custom Script Extension for Windows
- Azure Storage blobs and SAS tokens
- PowerShell
- Azure CLI
- Windows Server and IIS

## Sources Consulted
- Microsoft Learn: Azure Custom Script Extension for Windows - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows
- Microsoft Learn: Virtual machine extensions and features for Windows - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-windows
- Microsoft Learn: Azure CLI `az vm extension` reference - https://learn.microsoft.com/en-us/cli/azure/vm/extension
- HashiCorp Developer: Terraform `textencodebase64` function - https://developer.hashicorp.com/terraform/language/functions/textencodebase64
- HashiCorp Developer: Terraform `filemd5` function - https://developer.hashicorp.com/terraform/language/functions/filemd5
- Terraform Registry: `azurerm_virtual_machine_extension` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension
- Terraform Registry: `azurerm_storage_blob` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_blob
- Terraform Registry: `azurerm_storage_account_sas` data source - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/storage_account_sas
- HashiCorp: Terraform AzureRM Provider 4.0 announcement - https://www.hashicorp.com/en/blog/terraform-azurerm-provider-4-0-adds-provider-defined-functions

## Issues Found
- SAS-bearing `fileUris` were placed in public extension `settings` in the storage-backed examples. Microsoft documents that sensitive file URLs, including SAS references, should be placed in `protectedSettings`. Updated the single-file and multi-file extension examples to put both `fileUris` and `commandToExecute` in `protected_settings`.
- The templated `-EncodedCommand` example used `base64encode(local.script_content)`, which encodes Terraform strings as UTF-8 bytes. PowerShell `-EncodedCommand` expects UTF-16LE Base64. Updated the example to use `textencodebase64(local.script_content, "UTF-16LE")`.
- The templated-script example rendered a connection string into a command stored in public `settings`. Updated it to use `protected_settings`.
- The troubleshooting output was labeled as an extension provisioning state but returned the Terraform resource ID. Renamed the output example and comment to `extension_id`.
- The forced update example used the Custom Script Extension `timestamp` setting with an MD5 string. Microsoft documents `timestamp` as a 32-bit integer trigger. Updated the Terraform example to use the `force_update_tag` argument with `filemd5(...)` instead.

## Review Notes
- The post pins the AzureRM provider to `~> 3.0`. AzureRM 4.x is current and includes breaking changes, but the reviewed snippets use resources and arguments that are valid for the pinned 3.x provider family. A future refresh could update the post to AzureRM 4.x explicitly.
- The Custom Script Extension has a 90-minute execution limit and runs under the LocalSystem account; the post's troubleshooting guidance is consistent with Microsoft guidance.
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate` locally.
