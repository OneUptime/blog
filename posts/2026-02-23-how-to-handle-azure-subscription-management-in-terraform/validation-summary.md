# Validation Summary: How to Handle Azure Subscription Management in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp `azurerm` provider (~> 3.80)
- Azure subscriptions / subscription vending (EA enrollment accounts)
- Azure virtual networks and cross-subscription VNet peering
- Azure Monitor diagnostic settings and Log Analytics
- Azure Policy (subscription-level assignments)
- Terraform remote state (azurerm backend)

## Sources Consulted
- HashiCorp Terraform `azurerm` provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- `azurerm_subscription` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription
- `azurerm_virtual_network_peering`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- `azurerm_subscription_policy_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription_policy_assignment
- Terraform provider configuration / aliases: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform `azurerm` backend: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Azure built-in policy "Require a tag on resource groups" (GUID `96670d01-0a4d-4649-9c89-2d3abc0a5025`): https://learn.microsoft.com/azure/governance/policy/samples/built-in-policies
- Azure billing scope ID format for EA: https://learn.microsoft.com/azure/cost-management-billing/manage/programmatically-create-subscription-enterprise-agreement

## Issues Found
No technical issues found.

## Review Notes
- The post pins `azurerm` to `~> 3.80`. As of 2026, `azurerm` 4.x is current. The examples are correct for 3.80 (notably the `metric` block on `azurerm_monitor_diagnostic_setting`, which was replaced by `enabled_metric` in 4.x and the `retention_policy` removal). Readers upgrading to 4.x will need to adjust the diagnostic-settings block.
- The `azurerm_subscription_policy_assignment` snippet references `data.azurerm_subscription.production.id` without showing the data-source declaration. The pattern is correct (the assignment's `subscription_id` expects the full `/subscriptions/{guid}` ID, which the data source returns), but a reader copying the snippet verbatim would need to add `data "azurerm_subscription" "production" { ... }`.
- The built-in policy GUID `96670d01-0a4d-4649-9c89-2d3abc0a5025` corresponds to "Require a tag on resource groups", which takes a single `tagName` parameter — matches the example's `parameters` payload.
- The EA `billing_scope_id` format used is correct; the post does not cover the MCA-equivalent format, which is a reasonable omission for a general overview.
