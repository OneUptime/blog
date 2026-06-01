# Validation Summary: How to Build Azure Cost Management Reports for Chargeback

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cost Management
- Azure Cost Management exports
- Azure Policy
- Azure CLI
- Azure Consumption Budgets REST API
- Power BI Azure Cost Management connector
- Python
- pandas

## Sources Consulted
- Microsoft Learn: Azure CLI `az costmanagement export` reference: https://learn.microsoft.com/en-us/cli/azure/costmanagement/export?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az consumption budget` reference: https://learn.microsoft.com/en-us/cli/azure/consumption/budget?view=azure-cli-latest
- Microsoft Learn: Consumption Budgets Create Or Update REST API: https://learn.microsoft.com/en-us/rest/api/consumption/budgets/create-or-update?view=rest-consumption-2024-08-01
- Microsoft Learn: Policy definitions for tagging resources: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Microsoft Learn: Azure Policy modify effect: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-modify
- Microsoft Learn: Azure CLI `az policy assignment` reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest
- Microsoft Learn: Customize views in Cost Analysis: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/customize-cost-analysis-views
- Microsoft Learn: Group and filter options in Cost Analysis and Budgets: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/group-filter
- Microsoft Learn: Azure Cost Management connector for Power Query / Power BI: https://learn.microsoft.com/en-us/power-query/connectors/azure-cost-management
- Microsoft Learn: Cost and usage details schema for Enterprise Agreement: https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/cost-usage-details-ea
- Microsoft Learn: Tutorial - Create and manage Cost Management exports: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports

## Issues Found
- The `az costmanagement export create` example used PowerShell-style parameters (`--schedule-recurrence`, `--recurrence-period-from`, and `--recurrence-period-to`) that are not valid Azure CLI parameters. Updated the command to use `--recurrence` and `--recurrence-period from=... to=...`, matching the official Azure CLI reference.
- The export recurrence dates were expired as of the validation date. Updated the example to use future recurrence dates relative to June 1, 2026, because the Azure CLI requires the recurrence start date to be in the future.
- The Cost Analysis section described adding a secondary grouping by service name. Microsoft documentation states Cost Analysis does not support grouping by multiple attributes. Updated the step to use table view or drill into a cost center and then group by service name.
- The Power BI connector step implied support for subscription or management group scopes. The official connector documentation supports EA enrollment numbers and supported Microsoft Customer Agreement billing scopes. Updated the wording to match those supported scopes.
- The budget command used `az consumption budget create` with `--filter` and `--notifications`, but that CLI command does not support those flags. Replaced the example with an `az rest` call to the current Consumption Budgets REST API, which supports tag filters and notification definitions.
- The Python allocation script assumed exported tag keys and a `Cost` column existed as top-level CSV columns. Azure cost details exports provide tags in a `Tags` field and use cost fields such as `CostInBillingCurrency`. Updated the script to parse the `Tags` JSON field and aggregate `CostInBillingCurrency`.
- The tag inheritance policy assignment used a Modify-effect built-in policy but did not include a managed identity. Added system-assigned identity, identity scope, role, and location flags to align with Azure Policy modify/remediation requirements.

## Review Notes
- The post is technically relevant and contains implementation guidance, CLI commands, REST API usage, and Python code, so it was reviewed as a code/technical blog post.
- Azure Cost Management data freshness is correctly described as delayed, though the Microsoft Power BI connector documentation currently states cost and usage data is typically available within 8 to 24 hours for supporting APIs and the Azure portal.
- Resource group tags are not included in cost details by default unless they are applied to resources or Cost Management tag inheritance is enabled. The post's Azure Policy-based tag inheritance approach is a valid way to place resource group tag values on child resources.
