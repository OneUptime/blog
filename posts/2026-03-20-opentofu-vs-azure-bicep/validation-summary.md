# Validation Summary: OpenTofu vs Azure Bicep: Choosing for Azure Infrastructure

## Status
validated

## Post Type
Comparison guide / decision-making article comparing two Infrastructure-as-Code tools for Azure.

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Azure Bicep (DSL for ARM templates)
- AzureRM Terraform/OpenTofu provider
- Azure Resource Manager (ARM)
- Azure CLI (`az deployment`)
- Azure Policy
- Azure Landing Zones / CAF Enterprise Scale
- HCL (HashiCorp Configuration Language)
- Checkov, tflint
- Terraform Registry / Bicep Registry

## Sources Consulted
- Azure Bicep documentation: deployment scopes (https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-to-subscription, https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-to-resource-group)
- Azure Bicep modules and `scope` keyword (https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules)
- Azure CLI `az deployment` reference (https://learn.microsoft.com/en-us/cli/azure/deployment)
- AzureRM provider documentation (azurerm_resource_group, azurerm_virtual_network, azurerm_subnet)
- Bicep GitHub repository and license (https://github.com/Azure/bicep — MIT License)
- OpenTofu license (MPL 2.0)
- Azure Terraform modules — `Azure` organization on Terraform Registry (https://registry.terraform.io/namespaces/Azure)
- Azure CAF Enterprise Scale repository (https://github.com/Azure/terraform-azurerm-caf-enterprise-scale)
- ARM resource API versions for `Microsoft.Resources/resourceGroups` and `Microsoft.Network/virtualNetworks`

## Issues Found

1. **Bicep example mixed deployment scopes (would fail to deploy).**
   The original Bicep example declared a `Microsoft.Resources/resourceGroups@2023-07-01` resource alongside a `Microsoft.Network/virtualNetworks@2023-09-01` resource in a file with no `targetScope`. Bicep defaults to `targetScope = 'resourceGroup'`, but at that scope you cannot create a resource group resource — that requires `targetScope = 'subscription'`. Conversely, at subscription scope you cannot directly inline resource-group-scoped resources like a vnet; those must be deployed via a `module` with `scope: rg`. The original example would therefore fail Bicep validation/deployment.
   **Fix:** Removed the inline resource group from the Bicep example and changed the comment to make it explicit that the example deploys into an existing resource group (the most idiomatic single-file Bicep pattern). Updated the `location` default to use `resourceGroup().location`. Moved the `tags` onto the vnet so the example still demonstrates tagging.

2. **`az deployment what-if` in the comparison matrix is not a valid command on its own.**
   The Azure CLI requires a scope subcommand: `az deployment group what-if`, `az deployment sub what-if`, `az deployment mg what-if`, or `az deployment tenant what-if`. The body of the post correctly uses `az deployment group what-if`, but the matrix listed the truncated form.
   **Fix:** Updated the matrix entry to `az deployment group what-if` to match the body and the actual CLI surface.

3. **"`terraform-azurerm-modules` organization" reference was inaccurate.**
   The Terraform Registry namespace and GitHub organization for these modules is `Azure` (e.g., `Azure/aks/azurerm`, `github.com/Azure/terraform-azurerm-aks`). The naming pattern `terraform-azurerm-*` is the per-repo convention, not the organization name.
   **Fix:** Changed the wording to "The `Azure` organization on the Terraform Registry provides battle-tested modules", which matches the registry source `Azure/aks/azurerm` shown immediately below.

## Review Notes
- The `Azure/aks/azurerm` module reference uses `version = "~> 7.0"`. Version 7.x is a real, valid release line, but newer major versions (9.x+) exist as of early 2026. The version constraint is technically correct (it pins to an older major) but readers starting fresh today would likely want a more current major. Left as-is since it is not technically wrong.
- The OpenTofu example uses a standalone `azurerm_subnet` resource. This is still supported, though the AzureRM provider has, in recent versions, encouraged either standalone subnet resources or inline `subnet` blocks (with associated deprecation discussions). The standalone form shown is the currently recommended pattern.
- The "Output | Direct API calls | ARM templates" matrix row is a reasonable simplification: under the hood, Bicep compiles to ARM JSON which ARM then translates into resource provider API calls; OpenTofu providers wrap REST/SDK calls. Acceptable shorthand for a comparison table.
- The `Microsoft.Resources/resourceGroups@2023-07-01` and `Microsoft.Network/virtualNetworks@2023-09-01` API versions are valid GA versions exposed by ARM.
- License claims are correct: OpenTofu is MPL 2.0, Bicep is MIT.
- The CAF Enterprise Scale URL (`https://github.com/Azure/terraform-azurerm-caf-enterprise-scale`) resolves to a real, current Microsoft-maintained repository.
