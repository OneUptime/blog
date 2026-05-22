# Validation Summary: How to Use Azure CAF Module for Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AzureRM Terraform provider
- Azure CAF enterprise-scale Terraform module
- Azure landing zones
- Azure Policy and management groups
- Azure connectivity and management subscriptions
- aztfmod/azurecaf naming provider

## Sources Consulted
- Azure landing zones Terraform module README: https://github.com/Azure/terraform-azurerm-caf-enterprise-scale
- Azure/caf-enterprise-scale Terraform Registry module inputs: https://registry.terraform.io/modules/Azure/caf-enterprise-scale/azurerm/latest
- HashiCorp tutorial for the CAF enterprise-scale module: https://developer.hashicorp.com/terraform/tutorials/azure/microsoft-caf-enterprise-scale
- Microsoft Learn, Deploy Azure Landing Zones by using Terraform: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/terraform-landing-zone
- aztfmod/azurecaf provider documentation: https://registry.terraform.io/providers/aztfmod/azurecaf/latest/docs/resources/azurecaf_name
- Local clone of Azure/terraform-azurerm-caf-enterprise-scale tags v5.2.1 and v6.3.1 for variable schemas, examples, outputs, and deprecation status.

## Issues Found
- The post described the CAF enterprise-scale module as the current default option without noting its current status. Updated the introduction and best-practices note to state that the module is in extended support, is scheduled for archival on August 1, 2026, and that Microsoft recommends Azure Verified Modules for new Azure landing zone deployments.
- The module ecosystem list mixed the module repository/registry names and incorrectly described `Azure/caf-enterprise-scale` as community modules. Updated it to identify `Azure/caf-enterprise-scale/azurerm` as the main registry module and `aztfmod/caf` as the broader CAF supermodule.
- The examples used the older v5 module line and older provider constraints. Updated CAF module examples to `~> 6.0` and the main provider constraints to the current documented Terraform/AzureRM/AzAPI/random/time baseline for the v6 module line.
- The enterprise-scale module examples omitted the aliased AzureRM provider mappings required by the module for management and connectivity scopes. Added `azurerm.connectivity` and `azurerm.management` provider configuration and provider mappings in module examples.
- The first example claimed `deploy_core_landing_zones = true` creates Corp and Online landing zones. In the current module, Corp and Online are controlled separately. Added `deploy_corp_landing_zones = true` and `deploy_online_landing_zones = true` where the shown hierarchy depends on them.
- The custom landing zone example placed a team landing zone under Corp without enabling the Corp landing zone. Added `deploy_corp_landing_zones = true`.
- The connectivity example used invalid input names: `threat_intel_mode`, `azure_sql_database`, and `azure_storage_blob`. Updated them to the documented schema names `threat_intelligence_mode`, `azure_sql_database_sqlserver`, and `storage_account_blob`.

## Review Notes
All HCL code fences were parsed locally with the Python `hcl2` parser after edits. The `terraform` CLI is not installed in this environment, so I could not run `terraform validate` or provider/module initialization.
