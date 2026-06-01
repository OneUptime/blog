# Validation Summary: How to Organize Azure Subscriptions and Management Groups

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure subscriptions
- Azure management groups
- Azure Policy
- Azure RBAC
- Azure CLI
- Azure Resource Graph
- Terraform
- Azure landing zone vending module

## Sources Consulted
- Azure CLI management group reference: https://learn.microsoft.com/cli/azure/account/management-group
- Azure CLI management group subscription reference: https://learn.microsoft.com/cli/azure/account/management-group/subscription
- Azure CLI policy assignment reference: https://learn.microsoft.com/cli/azure/policy/assignment
- Azure CLI consumption budget reference: https://learn.microsoft.com/cli/azure/consumption/budget
- Azure CLI role assignment reference: https://learn.microsoft.com/cli/azure/role/assignment
- Azure subscription and service limits: https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits
- Azure Cloud Adoption Framework management group guidance: https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups
- Azure Resource Graph management group sample queries: https://learn.microsoft.com/azure/governance/management-groups/resource-graph-samples
- Azure lz-vending Terraform module documentation: https://github.com/Azure/terraform-azurerm-lz-vending
- Terraform Registry Azure lz-vending module: https://registry.terraform.io/modules/Azure/lz-vending/azurerm/latest

## Issues Found
- The Terraform `Azure/lz-vending/azurerm` example omitted required module inputs for current versions. Added `location` and `subscription_alias_name`.
- The Terraform example used `resource_group_name` inside `virtual_networks`, but current module versions require `resource_group_key` or `resource_group_name_existing`. Added `resource_group_creation_enabled`, a `resource_groups` entry, and changed the virtual network to use `resource_group_key`.
- The Terraform example supplied a top-level `tags` argument, but the module uses `subscription_tags` for subscription tags. Moved the tag map to `subscription_tags`.
- The Terraform role assignments were supplied without enabling role assignment creation. Added `role_assignment_enabled = true`.
- The budget example described a budget as a spending limit and omitted required CLI arguments. Changed the wording to a monthly cost budget, added `--category cost`, changed `Monthly` to the documented `monthly` value, and replaced invalid `--subscription-id` with the Azure CLI global `--subscription` argument.
- The custom deny-all policy assignment used an invalid custom policy definition ID path. Updated it to a management-group-scoped policy definition resource ID.

## Review Notes
The local environment did not have `az` or `terraform` installed, so command and Terraform validation was performed against official Microsoft documentation and the Azure lz-vending module documentation. The policy names in the article are placeholders for custom or pre-created policy definitions; those names are plausible but would need to exist in the target tenant before the commands run.
