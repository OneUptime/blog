# Validation Summary: How to Set Up Azure Management Groups with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AzureRM provider
- Azure Management Groups
- Azure subscriptions
- Azure Policy
- Azure RBAC
- HCL

## Sources Consulted
- Azure Management Groups overview: https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Azure management group subscription management: https://learn.microsoft.com/en-us/azure/governance/management-groups/manage
- Azure RBAC scope overview: https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview
- Azure Policy tutorial and built-in Allowed locations policy example: https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-and-manage
- Azure Blueprints overview and deprecation notice: https://learn.microsoft.com/en-us/azure/governance/blueprints/overview
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- AzureRM provider `azurerm_management_group` resource documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/management_group.html.markdown
- AzureRM provider `azurerm_management_group` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/management_group.html.markdown
- AzureRM provider `azurerm_management_group_subscription_association` resource documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/management_group_subscription_association.html.markdown
- AzureRM provider `azurerm_management_group_policy_assignment` resource documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/management_group_policy_assignment.html.markdown
- AzureRM provider `azurerm_role_assignment` resource documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/role_assignment.html.markdown

## Issues Found
1. **Incorrect Blueprints inheritance wording.** The post said Policies, RBAC, and Blueprints applied to a management group are inherited by subscriptions. Azure Management Groups documentation supports inheritance for governance conditions such as policy and Azure RBAC role assignments, while Azure Blueprints is a preview service scheduled for deprecation on July 11, 2026 and its management group assignment semantics still target a subscription. Removed Blueprints from that inheritance sentence and clarified that policies and Azure RBAC role assignments inherit to child management groups, subscriptions, and resources.
2. **Direct-only subscription listing.** The post used `data.azurerm_management_group.workloads.subscription_ids` to list subscriptions under the `workloads` management group, but the AzureRM data source documents `subscription_ids` as only the subscriptions directly assigned to that group. Since the example assigns subscriptions to child groups (`production` and `nonprod`), changed the output to `all_subscription_ids`.
3. **Missing dependency before reading child subscription associations.** The data source read for the `workloads` management group depended only on the management group itself, so an initial apply could read before the subscription association resources were created. Added `depends_on` for the two association resources so the recursive subscription output reflects the hierarchy created by the example.

## Review Notes
- The `azurerm_management_group`, `azurerm_management_group_subscription_association`, `azurerm_management_group_policy_assignment`, and `azurerm_role_assignment` snippets use current AzureRM provider resource names and documented arguments.
- The built-in Allowed locations policy definition ID and `listOfAllowedLocations` parameter name match Microsoft Learn examples.
- `tofu` and `terraform` were not installed in the local environment, so snippets were verified against official OpenTofu, Microsoft Learn, and AzureRM provider documentation rather than by running a local plan.
