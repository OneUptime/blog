# Validation Summary: Configure Terraform Moved Blocks for Azure Resource Refactoring Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language
- Terraform moved blocks
- Terraform state management
- Terraform import and removed blocks
- AzureRM Terraform provider
- Azure Storage, Azure SQL, Azure networking, Azure compute, and Azure Redis resource examples

## Sources Consulted
- Terraform moved block reference: https://developer.hashicorp.com/terraform/language/block/moved
- Terraform module refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform state refactoring documentation: https://docs.hashicorp.com/terraform/language/state/refactor
- Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform provider state move framework documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/state-move
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- AzureRM storage account resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM MSSQL server and database resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server and https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- AzureRM virtual network, subnet, network security group, Linux virtual machine, Redis cache, and private endpoint resource documentation in the Terraform Registry.

## Issues Found
- The safe refactoring workflow said to create the new module or resource structure "without deleting the old code." That could lead readers to keep both old and new active resource addresses, which is not the intended moved-block workflow. Updated it to say the configuration should be moved to the new address, leaving only the new address active, with the `moved` block mapping the old state address to the new address.
- The workflow said moved blocks are only needed for the transition and can optionally be removed after apply. This is technically true for one workspace after successful apply, but incomplete for shared modules or multiple workspaces. Updated it to clarify that they should only be removed once every workspace or module consumer that needs the migration has applied them.
- The limitations section suggested `terraform_remote_state` as an approach for moving resources between separate state files. Official Terraform documentation describes `terraform_remote_state` as a way to reference outputs from another state, not to transfer resource ownership. Updated the section to recommend configuration-driven `removed` and `import` blocks, or `terraform state mv` for direct state-file moves.
- The limitations section said moved blocks cannot change resource type and used `azurerm_storage_account_v2` as an example. Current Terraform can support provider-implemented cross-type state moves in specific cases, and `azurerm_storage_account_v2` is not an AzureRM resource type. Updated the text to explain that cross-type moves require explicit provider support; otherwise, use remove and import.

## Review Notes
The AzureRM resource snippets use current resource types and arguments for illustrative Terraform examples. The examples omit surrounding provider, variable, resource group, and module internals, which is acceptable for a refactoring-focused guide.
