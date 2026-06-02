# Validation Summary: How to Set Up Azure Cost Alerts and Budgets to Prevent Bill Shock

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cost Management
- Azure Consumption budgets
- Azure CLI
- Azure REST API
- Azure Monitor action groups
- Cost anomaly alerts
- Cost Management exports

## Sources Consulted
- Microsoft Learn: Azure CLI `az consumption budget` reference: https://learn.microsoft.com/en-us/cli/azure/consumption/budget?view=azure-cli-latest
- Microsoft Learn: Azure Consumption Budgets REST API: https://learn.microsoft.com/en-us/rest/api/consumption/budgets/create-or-update?view=rest-consumption-2024-08-01
- Microsoft Learn: Azure Cost Management Scheduled Actions REST API: https://learn.microsoft.com/en-us/rest/api/cost-management/scheduled-actions/create-or-update-by-scope?view=rest-cost-management-2025-03-01
- Microsoft Learn: Azure CLI `az monitor action-group` reference: https://learn.microsoft.com/en-gb/cli/azure/monitor/action-group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az costmanagement export` reference: https://learn.microsoft.com/en-us/cli/azure/costmanagement/export?view=azure-cli-latest
- Microsoft Learn: Identify anomalies and unexpected changes in cost: https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/analyze-unexpected-charges
- Microsoft Learn: Azure billing and Cost Management budget scenario: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/cost-management-budget-scenario

## Issues Found
- The `az consumption budget create` examples used title-case values for `--time-grain` and `--category`; current Azure CLI documentation lists lowercase values for the create command. Updated them to `monthly` and `cost`.
- The subscription budget example included an empty `--resource-group-filter ""`, which is unnecessary for a subscription-wide budget and could be confusing. Removed it.
- The budget REST examples used older `2023-05-01` API versions. Updated them to the current Azure Consumption Budgets API version `2024-08-01`.
- The Azure Monitor action group example used outdated singular flags `--email-receiver` and `--webhook-receiver`. Updated the example to use the documented `--action` syntax for email and webhook receivers.
- The anomaly alert REST example used an older `2023-08-01` API version. Updated it to the current Cost Management Scheduled Actions API version `2025-03-01`.
- The tag-filtered budget example omitted the required comparison `operator` field for the tag expression. Added `"operator": "In"`.
- The Cost Management export example used `--schedule-recurrence`, but the current CLI option is `--recurrence`. Updated the option and changed the recurrence period dates to full UTC timestamps matching the documented format.

## Review Notes
The Azure CLI `consumption` budget command group is still marked preview in the official CLI reference, while the Cost Management export command group is a GA extension. The post is technically accurate after the corrections above.
