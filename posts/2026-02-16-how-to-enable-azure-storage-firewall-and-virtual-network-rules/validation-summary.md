# Validation Summary: How to Enable Azure Storage Firewall and Virtual Network Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage account network security
- Azure Storage firewall and virtual network rules
- Azure CLI
- Azure PowerShell Az.Storage
- ARM templates
- Terraform AzureRM provider
- Azure Virtual Network service endpoints

## Sources Consulted
- Azure Storage firewall rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Guidelines and limitations for Azure Storage firewall: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-limitations
- Trusted Azure services for Azure Storage network security: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-trusted-azure-services
- Azure CLI `az storage account network-rule`: https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Azure CLI `az storage account`: https://learn.microsoft.com/en-us/cli/azure/storage/account
- PowerShell `Update-AzStorageAccountNetworkRuleSet`: https://learn.microsoft.com/en-us/powershell/module/az.storage/update-azstorageaccountnetworkruleset
- PowerShell `Add-AzStorageAccountNetworkRule`: https://learn.microsoft.com/en-us/powershell/module/az.storage/add-azstorageaccountnetworkrule
- ARM template reference for `Microsoft.Storage/storageAccounts` 2023-01-01: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Terraform AzureRM `azurerm_storage_account` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform AzureRM `azurerm_storage_account_network_rules` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules

## Issues Found
- The post described a fixed firewall rule evaluation order and incorrectly grouped resource instance rules as trusted Azure services. Microsoft documents virtual network rules, IP network rules, resource instance rules, and trusted service exceptions as separate ways to allow traffic, with unmatched traffic controlled by the default action. I changed the wording to avoid an unsupported ordering claim and separated resource instance rules from trusted service exceptions.
- The post implied that firewall denial applies generally, but Azure Storage firewall rules control access through the public endpoint. I clarified that non-whitelisted requests through the public endpoint receive the denial.
- The ARM template example omitted required storage account resource fields. I added `sku` and `kind` so the example is a valid `Microsoft.Storage/storageAccounts` resource shape for the referenced API version.
- The Terraform example used `virtual_network_subnet_ids` without noting the required storage service endpoint on the subnet. I added a short comment that `azurerm_subnet.main` must have `service_endpoints = ["Microsoft.Storage"]`.

## Review Notes
The Azure CLI, PowerShell, ARM `networkAcls`, and Terraform network rule field names and values are current and consistent with official documentation. The examples use documentation-reserved IP ranges, which are appropriate for illustrative blog snippets but must be replaced with real public IP addresses in production.
