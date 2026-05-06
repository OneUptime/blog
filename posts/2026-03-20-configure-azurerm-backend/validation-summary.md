# Validation Summary: How to Configure the Azure Backend (azurerm) in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Blob Storage
- Azure Resource Manager / AzureRM provider
- Azure CLI
- Microsoft Entra ID
- Azure RBAC
- HCL

## Sources Consulted
- OpenTofu azurerm backend docs: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu azurerm backend source: https://github.com/opentofu/opentofu/blob/v1.11.0/internal/backend/remote-state/azure/client.go
- AzureRM provider `azurerm_storage_container` docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- AzureRM provider `azurerm_storage_account` docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Azure CLI `az storage blob show` docs: https://learn.microsoft.com/en-us/cli/azure/storage/blob#az-storage-blob-show
- Azure CLI `az storage blob lease break` docs: https://learn.microsoft.com/en-us/cli/azure/storage/blob/lease#az-storage-blob-lease-break
- Azure CLI authorization guidance for blob data operations: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Azure Blob lease REST API docs: https://learn.microsoft.com/en-us/rest/api/storageservices/lease-blob
- Azure built-in roles for Storage: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage

## Issues Found
- The bootstrap example used `storage_account_name` on `azurerm_storage_container`, which is deprecated in current AzureRM provider docs. I changed it to `storage_account_id = azurerm_storage_account.state.id`.
- The managed identity backend example omitted `use_azuread_auth = true`, which conflicted with the post's RBAC guidance that only grants `Storage Blob Data Contributor`. I added `use_azuread_auth = true` so the example uses Entra ID data-plane auth instead of trying to fetch a storage account access key.
- The state locking section incorrectly claimed a 60-second lock with auto-renewal and automatic expiry after crashes. OpenTofu's `azurerm` backend currently acquires an infinite blob lease and releases it on completion; if a process crashes, the lease can remain until manually broken. I corrected the explanation accordingly.
- The lease inspection and break commands omitted `--auth-mode login`, which could cause Azure CLI to fall back to access-key lookup instead of using Entra/RBAC auth. I added `--auth-mode login` to match the rest of the article's access model.
- The introduction used the outdated `Azure AD` name. I updated it to `Microsoft Entra ID` to match current official terminology.

## Review Notes
- OpenTofu backend docs warn against hardcoding secrets in backend configuration because backend settings are written in plain text to the `.terraform` directory and embedded in saved plan files. Using `ARM_*` environment variables remains the safer approach.
