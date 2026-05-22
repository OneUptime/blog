# Validation Summary: How to Configure Azure Blob Storage Backend for Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform `azurerm` backend
- Azure Blob Storage
- Azure Storage accounts and containers
- Azure CLI
- Microsoft Entra ID authentication
- Azure managed identities
- Azure Key Vault customer-managed keys
- Azure Storage network rules and service endpoints

## Sources Consulted
- HashiCorp Terraform `azurerm` backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Microsoft Learn, Create an Azure Storage account: https://learn.microsoft.com/azure/storage/common/storage-account-create
- Microsoft Learn, Azure CLI `az storage container`: https://learn.microsoft.com/cli/azure/storage/container
- Microsoft Learn, Enable and manage blob versioning: https://learn.microsoft.com/azure/storage/blobs/versioning-enable
- Microsoft Learn, Azure Storage encryption for data at rest: https://learn.microsoft.com/azure/storage/common/storage-service-encryption
- Microsoft Learn, Configure customer-managed keys for an existing storage account: https://learn.microsoft.com/azure/storage/common/customer-managed-keys-configure-existing-account
- Microsoft Learn, Customer-managed keys for account encryption: https://learn.microsoft.com/azure/storage/common/customer-managed-keys-overview
- Microsoft Learn, Azure Storage firewall rules: https://learn.microsoft.com/azure/storage/common/storage-network-security
- Microsoft Learn, Azure CLI `az storage account network-rule`: https://learn.microsoft.com/cli/azure/storage/account/network-rule
- OneUptime linked article check: https://oneuptime.com/blog/post/2026-02-23-terraform-backend-partial-configuration/view

## Issues Found
- The post described Azure CLI backend authentication as automatic. Current Terraform `azurerm` backend documentation requires `use_cli = true` for Azure CLI authentication, and `use_azuread_auth = true` when authenticating to the storage data plane with Microsoft Entra ID. Updated the Azure CLI, service principal, managed identity, and relevant example backend snippets.
- The post used the legacy Azure Active Directory name. Updated it to Microsoft Entra ID.
- Azure CLI storage data-plane commands omitted `--auth-mode login`, which could cause the CLI to fall back to account-key lookup instead of using the authenticated Azure identity. Added `--auth-mode login` to container, blob show, and blob list examples where Microsoft Entra auth is intended.
- The customer-managed key example did not create or authorize a managed identity for the storage account, and did not enable purge protection on the key vault. Added system-assigned identity setup, Key Vault key permissions, purge protection, and an empty `--encryption-key-version` for automatic key version updates.
- The storage account VNet rule example did not enable the required Azure Storage service endpoint on the subnet. Added the `az network vnet subnet update --service-endpoints Microsoft.Storage` step before adding the network rule.

## Review Notes
The local environment did not have `az` or `terraform` installed, so commands could not be tested against local `--help` output or executed. Validation was performed against official HashiCorp and Microsoft documentation. The access-key authentication section is technically valid, but HashiCorp currently recommends more secure identity-based or OIDC approaches for new workloads.
