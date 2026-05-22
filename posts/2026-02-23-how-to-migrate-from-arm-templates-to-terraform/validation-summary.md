# Validation Summary: How to Migrate from ARM Templates to Terraform

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Resource Manager templates
- Azure CLI deployment commands
- Terraform
- Terraform AzureRM provider
- Azure Export for Terraform (`aztfexport`)
- Terraform import blocks

## Sources Consulted
- Microsoft Learn: Azure CLI `az deployment group` command reference, https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: Azure Resource Manager deployment modes and complete mode deletion behavior, https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-complete-mode-deletion
- Microsoft Learn: Azure Resource Manager deployments REST API, including `outputResources`, https://learn.microsoft.com/en-us/rest/api/resources/deployments/get
- Microsoft Learn: Azure Export for Terraform overview and concepts, https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-terraform-overview and https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-terraform-concepts
- Microsoft Learn: Azure Export for Terraform import block generation, https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/select-custom-resources
- Azure/aztfexport GitHub repository, https://github.com/Azure/aztfexport
- HashiCorp Developer: Terraform import blocks and import command reference, https://developer.hashicorp.com/terraform/language/import and https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform Registry: AzureRM provider and resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- Corrected the explanation of ARM deployment deletion. The original wording implied that deleting a deployment could delete resources when Complete mode was involved. Azure documentation distinguishes deleting a deployment history record, which does not affect resource state, from deploying in Complete mode, which can delete resources not present in the template. The post now states this distinction explicitly.

## Review Notes
The commands and Terraform snippets are broadly correct as migration examples. The local environment did not have `az`, `aztfexport`, or `terraform` installed, so command availability was verified against official documentation and the Azure Export for Terraform source rather than local `--help` output.
