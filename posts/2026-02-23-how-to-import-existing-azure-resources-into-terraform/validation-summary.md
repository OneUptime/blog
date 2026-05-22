# Validation Summary: How to Import Existing Azure Resources into Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform import blocks
- HashiCorp AzureRM provider
- Azure Resource Manager resource IDs
- Azure CLI
- Azure Resource Groups
- Azure Linux Virtual Machines
- Azure Storage Accounts
- Azure Virtual Networks and Subnets
- Azure SQL / Microsoft SQL Server and Databases

## Sources Consulted
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- Terraform import existing resources guide: https://developer.hashicorp.com/terraform/language/import/single-resource
- AzureRM provider repository and current provider documentation source: https://github.com/hashicorp/terraform-provider-azurerm
- AzureRM `azurerm_linux_virtual_machine` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM `azurerm_storage_account` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM `azurerm_virtual_network` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- AzureRM `azurerm_subnet` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- AzureRM `azurerm_mssql_server` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM `azurerm_mssql_database` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- Azure CLI `az resource` reference: https://learn.microsoft.com/en-us/cli/azure/resource
- Azure CLI query/output guidance: https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query

## Issues Found
- Updated the AzureRM provider constraint from `~> 3.0` to `~> 4.0` so the tutorial targets the current major provider line.
- Fixed the Linux VM import example so `network_interface_ids` no longer references an undeclared `azurerm_network_interface.app` resource.
- Added an `admin_ssh_key` block to the Linux VM example because the AzureRM Linux VM resource requires either `admin_password` or `admin_ssh_key` unless using an existing OS managed disk.
- Replaced the SQL password variable default with a structurally valid non-secret placeholder because Azure SQL passwords must satisfy password complexity requirements.
- Changed the `az resource list --output table` command to explicitly project `id` as `ResourceId`, because Azure CLI table output omits the `id` key unless it is renamed.
- Clarified that the basic Azure resource ID pattern applies to top-level resources and nested resources append additional parent/child path segments.

## Review Notes
The local environment did not have `terraform` or `az` installed, so command execution and Terraform validation could not be run locally. The examples were reviewed against official Terraform, AzureRM provider, and Azure CLI documentation instead. The import block workflow is correct for Terraform 1.5+, and HashiCorp documentation allows keeping import blocks after import as a historical record.
