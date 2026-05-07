# Validation Summary: How to Configure Azure Storage Shared Access Signatures with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Storage
- Shared Access Signatures (SAS)
- Azure Key Vault
- OpenTofu
- AzureRM provider
- HCL

## Sources Consulted
- HashiCorp AzureRM provider docs: `azurerm_storage_account_sas` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/storage_account_sas.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_storage_account_blob_container_sas` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/storage_account_blob_container_sas.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_storage_container` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_container.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_key_vault_secret` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/key_vault_secret.html.markdown
- Microsoft Learn: Create an account SAS - https://learn.microsoft.com/en-us/rest/api/storageservices/create-account-sas
- Microsoft Learn: Create a service SAS - https://learn.microsoft.com/en-us/rest/api/storageservices/create-service-sas
- Microsoft Learn: Grant limited access to Azure Storage resources using shared access signatures (SAS) - https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview
- OpenTofu docs: `timestamp` - https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu docs: `timeadd` - https://opentofu.org/docs/language/functions/timeadd/

## Issues Found
- The storage container example used deprecated `storage_account_name`. I changed it to `storage_account_id` to match the current AzureRM provider recommendation.
- The account SAS example used the wrong argument name and an unsupported CIDR format for SAS IP restrictions. I changed `ip_address = "203.0.113.0/24"` to `ip_addresses = "203.0.113.10-203.0.113.20"` because the provider expects `ip_addresses` and Azure SAS supports a single IPv4 address or a dash-delimited IPv4 range, not CIDR notation.
- Two explanatory comments in the account SAS snippet did not match the actual configuration. I corrected them so the comments now reflect blob-only service selection and container/object resource types.
- The container SAS example used the wrong data source name. I changed `azurerm_storage_blob_sas` to `azurerm_storage_account_blob_container_sas`, which is the current AzureRM data source for generating a container SAS.
- The container SAS permissions block used `tag`, but the current provider schema uses `tags`. I corrected that field name.
- The Key Vault and output examples were wired to the account-level SAS even though the surrounding example was for a short-lived upload/container SAS. I updated both snippets to use `container_sas`, aligned the secret expiration to the same one-hour schedule, and changed the output to produce the uploads container SAS URL.

## Review Notes
- Microsoft recommends using a user delegation SAS when possible because it is signed with Microsoft Entra credentials rather than the storage account key. The post remains technically valid, but it demonstrates account key-based SAS generation.
- The `timestamp()` function is apply-time and changes on every run. The example is valid, but repeated applies will naturally regenerate the short-lived SAS and the Key Vault secret expiration.
- The snippets assume `azurerm_resource_group.rg` and `azurerm_key_vault.kv` already exist elsewhere in the configuration.
