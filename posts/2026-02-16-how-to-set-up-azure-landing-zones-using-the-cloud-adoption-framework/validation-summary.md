# Validation Summary: How to Set Up Azure Landing Zones Using the Cloud Adoption Framework

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Landing Zones
- Microsoft Cloud Adoption Framework for Azure
- Azure Verified Modules for Terraform
- Azure CLI
- Azure Policy
- Azure management groups
- Hub-and-spoke networking
- Subscription vending

## Sources Consulted
- Microsoft Learn: Deploy Azure landing zones - https://learn.microsoft.com/en-us/azure/architecture/landing-zones/landing-zone-deploy
- Microsoft Learn: Azure Verified Modules for Platform Landing Zones (ALZ) - https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/terraform-landing-zone
- Microsoft Learn: Management groups in the Azure landing zone architecture - https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups
- Microsoft Learn: Azure CLI `az account create` - https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az account management-group subscription add` - https://learn.microsoft.com/en-us/cli/azure/account/management-group/subscription?view=azure-cli-latest
- Microsoft Learn: Azure Policy tag definitions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Terraform Registry: Azure/avm-ptn-alz/azurerm - https://registry.terraform.io/modules/Azure/avm-ptn-alz/azurerm/latest
- Terraform Registry: Azure/avm-ptn-alz-management/azurerm - https://registry.terraform.io/modules/Azure/avm-ptn-alz-management/azurerm/latest
- Terraform Registry: Azure/avm-ptn-alz-connectivity-hub-and-spoke-vnet/azurerm - https://registry.terraform.io/modules/Azure/avm-ptn-alz-connectivity-hub-and-spoke-vnet/azurerm/latest
- Terraform Registry: Azure/avm-ptn-alz-sub-vending/azure - https://registry.terraform.io/modules/Azure/avm-ptn-alz-sub-vending/azure/latest
- Azure GitHub: terraform-azurerm-caf-enterprise-scale deprecation notice - https://github.com/Azure/terraform-azurerm-caf-enterprise-scale
- Azure GitHub: terraform-azurerm-lz-vending archived notice - https://github.com/Azure/terraform-azurerm-lz-vending

## Issues Found
- The post used the older `Azure/caf-enterprise-scale/azurerm` module as the primary production Terraform path. That module is in extended support and scheduled for archival, so the example was updated to the current AVM-based `Azure/avm-ptn-alz/azurerm` module and related AVM modules.
- The management group diagram skipped the intermediate root management group and omitted the Security and Local management groups from the standard ALZ hierarchy. The diagram and component list were updated to match Microsoft CAF guidance.
- The old connectivity example used invalid or outdated `caf-enterprise-scale` fields such as `enable_firewall`, `enable_vpn_gateway`, list-shaped `azure_firewall` and `dns` objects, and `threat_intel_mode`. It was replaced with the current AVM hub-and-spoke connectivity module syntax.
- The Azure CLI subscription placement example passed a subscription display name to `--subscription`. The command was changed to use a subscription ID placeholder, which is what the CLI expects.
- The tag policy assignment used the wrong built-in policy ID for "Require a tag on resource groups." It now uses `96670d01-0a4d-4649-9c89-2d3abc0a5025`.
- The deny-public-IP example used the "Not allowed resource types" built-in policy without the required `listOfResourceTypesNotAllowed` parameter. The assignment now passes `Microsoft.Network/publicIPAddresses`.
- The subscription vending example used the archived `Azure/lz-vending/azurerm` module and older virtual network field names. It now uses `Azure/avm-ptn-alz-sub-vending/azure`, adds a subscription alias name, enables role assignments, creates a network resource group, and uses the current hub peering option objects.
- The "What Gets Deployed" list implied that every workload subscription always gets route tables, NSGs, and budget alerts. This was qualified because those resources depend on the vending configuration.

## Review Notes
The snippets are still illustrative and require real tenant, billing, subscription, address-space, and role-assignment values before deployment. The Azure CLI `az account create` command is marked preview in the official CLI documentation and applies to supported billing account scenarios such as Enterprise Agreement enrollment accounts.
