# Validation Summary: How to Write Terratest Tests for Azure Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terratest
- Azure Resource Manager
- Azure CLI authentication
- Azure Virtual Networks
- Azure Virtual Machines
- Azure Storage Accounts
- Azure SQL Database
- Azure Network Security Groups
- Azure Key Vault
- Go
- GitHub Actions

## Sources Consulted
- Terratest Azure package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/azure
- Terratest v1.0.0 Azure source: https://github.com/gruntwork-io/terratest/tree/v1.0.0/modules/azure
- Terratest package overview: https://terratest.gruntwork.io/docs/getting-started/packages-overview/
- Azure CLI `az login` documentation: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli
- Azure Terraform service principal authentication documentation: https://learn.microsoft.com/en-us/azure/developer/terraform/authenticate-to-azure-with-service-principle
- Azure Login GitHub Action documentation: https://github.com/Azure/login
- Azure SDK for Go source for ARM compute, network, storage, and Key Vault models: https://github.com/Azure/azure-sdk-for-go
- Microsoft Go SQL Server driver documentation: https://pkg.go.dev/github.com/microsoft/go-mssqldb

## Issues Found
- Replaced deprecated Terratest Azure helpers with current context-aware v1 helpers, including `VirtualNetworkExistsContext`, `GetVirtualNetworkContextE`, `SubnetExistsContext`, `GetVirtualMachineContextE`, `StorageAccountExistsContext`, and `GetStorageAccountContextE`.
- Fixed Azure SDK field references that used old struct names such as `VirtualNetworkPropertiesFormat`, `VirtualMachineProperties`, and `AccountProperties`; current SDK objects expose these through `Properties`, `SKU`, and nested pointer fields.
- Removed non-existent NSG helpers (`NetworkSecurityGroupExists`, `GetNetworkSecurityGroupE`) and used `GetAllNSGRulesContextE` plus `FindRuleByName`.
- Removed non-existent `KeyVaultExists` usage and corrected `GetKeyVault` argument ordering by using `GetKeyVaultContextE(t, ctx, resourceGroupName, vaultName, "")`.
- Replaced deprecated `random.UniqueId()` with `random.UniqueID()`.
- Lowercased generated Azure Storage, Azure SQL server, and Key Vault names because `random.UniqueID()` can include uppercase letters and these Azure resource names are DNS-style names with lowercase constraints in common Terraform usage.
- Updated the SQL Server driver import from the older `github.com/denisenkom/go-mssqldb` path to Microsoft’s current `github.com/microsoft/go-mssqldb` module path.

## Review Notes
The code examples are representative module tests and still depend on matching Terraform modules and outputs existing under the referenced paths. I could not run `go test` locally because the workspace environment does not have the Go toolchain installed.
