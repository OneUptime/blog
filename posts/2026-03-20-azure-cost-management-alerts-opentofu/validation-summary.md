# Validation Summary: How to Create Azure Cost Management Alerts with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AzureRM provider
- Azure Cost Management budgets
- Azure subscriptions and resource groups

## Sources Consulted
- HashiCorp AzureRM provider resource docs for `azurerm_consumption_budget_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/consumption_budget_subscription.html.markdown
- HashiCorp AzureRM provider resource docs for `azurerm_consumption_budget_resource_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/consumption_budget_resource_group.html.markdown
- HashiCorp AzureRM 4.0 upgrade guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- Microsoft Learn, Tutorial: Create and manage budgets: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets
- Microsoft Learn, Budgets REST API: https://learn.microsoft.com/en-us/rest/api/cost-management/budgets/list?view=rest-cost-management-2024-08-01
- Microsoft Learn, Quickstart: Create a budget with an Azure Resource Manager template: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-create-budget-template

## Issues Found
- The provider configuration was pinned to `~> 3.0`, which is outdated relative to the current AzureRM provider line. I updated it to `~> 4.0` and added `subscription_id = var.subscription_id` because AzureRM 4.x requires the subscription ID in the provider configuration or via `ARM_SUBSCRIPTION_ID`.
- All budget examples used `start_date = "2024-01-01T00:00:00Z"`. I updated them to `2026-05-01T00:00:00Z` because Azure budget start dates must be the first day of the month, and past dates must remain within the current time-grain period.
- The inline comment claiming that omitting `end_date` makes the budget recur indefinitely was incorrect. I corrected it to match provider behavior: if `end_date` is omitted, Azure sets it to 10 years after `start_date`.
- The resource group filter comment said it was filtering to a specific service, but the example actually filters the `ResourceType` dimension. I corrected the comment to say resource types.

## Review Notes
- The fixed `start_date` examples are time-sensitive. Future maintenance should keep them aligned to the first day of the current month or a near-future month to avoid Azure validation errors.
- The remaining HCL examples are consistent with the documented AzureRM budget resource schema, including `notification`, `filter.dimension`, and `filter.tag` blocks.
