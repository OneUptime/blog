# Validation Summary: How to Set Up Azure Landing Zones with Terraform Enterprise Scale Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure landing zones
- Azure Cloud Adoption Framework
- Azure management groups
- Terraform
- Azure/caf-enterprise-scale/azurerm Terraform module
- AzureRM Terraform provider
- Azure CLI
- Azure RBAC
- Microsoft Defender for Cloud
- Microsoft Sentinel
- Azure Firewall
- Azure Private DNS zones

## Sources Consulted
- Azure landing zones Terraform module README and v5.0.0 source: https://github.com/Azure/terraform-azurerm-caf-enterprise-scale
- Terraform Registry entry for Azure/caf-enterprise-scale/azurerm v5.0.0: https://registry.terraform.io/modules/Azure/caf-enterprise-scale/azurerm/5.0.0
- Azure landing zone management group guidance: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups
- Microsoft Learn guidance for elevating Global Administrator access: https://learn.microsoft.com/azure/role-based-access-control/elevate-access-global-admin
- Microsoft announcement for Terraform Azure Verified Modules for Platform Landing Zone: https://techcommunity.microsoft.com/blog/azuretoolsblog/announcing-general-availability-of-terraform-azure-verified-modules-for-platform/4366027
- Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration

## Issues Found
- The Terraform prerequisite and `required_version` were listed as 1.3.0, but module v5.0.0 requires Terraform 1.3.1 or later. Updated both references to 1.3.1.
- The module examples omitted the required provider alias mapping for `azurerm.connectivity` and `azurerm.management`. Added the `providers` block shown in the official module documentation.
- The basic deployment text said it creates the full hierarchy. The module defaults deploy the core hierarchy, while Corp and Online are optional. Updated the wording to "core management group hierarchy."
- The management and connectivity examples used `null` for `tags`, which is passed into `merge(...)` in the module. Changed explicit default values to `{}` and set location fields to empty strings where the module expects default location fallback behavior.
- The connectivity subscription placeholder used non-GUID characters. Replaced it with a syntactically valid placeholder GUID.
- The Private Link DNS example used invalid v5 module keys `azure_storage_blob` and `azure_web_sites_sites`. Replaced them with `storage_account_blob` and `azure_web_apps_sites`.
- The conclusion said the Enterprise Scale module is the fastest path for new production environments. Updated it to note that Microsoft now recommends Azure Verified Modules for new platform landing zone deployments while the Enterprise Scale module remains relevant for existing standardization.

## Review Notes
- I could not run `terraform validate` locally because Terraform is not installed in this environment.
- The reviewed examples are still illustrative and use placeholder subscription IDs. A real deployment should use provider aliases bound to the intended management and connectivity subscriptions.
