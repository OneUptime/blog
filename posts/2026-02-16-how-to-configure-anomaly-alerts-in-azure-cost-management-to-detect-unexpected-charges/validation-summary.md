# Validation Summary: Configure Anomaly Alerts in Azure Cost Management to Detect Unexpected Charges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cost Management and Billing
- Azure Cost Management anomaly detection
- Azure Cost Management scheduled actions
- Azure CLI and `az rest`
- Azure Monitor Activity Log
- Azure Cost Management Query REST API
- Python `requests`

## Sources Consulted
- Microsoft Learn: Identify anomalies and unexpected changes in cost - https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/analyze-unexpected-charges
- Microsoft Learn: Microsoft.CostManagement/scheduledActions ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.costmanagement/2025-03-01/scheduledactions
- Microsoft Learn: Scheduled Actions - Create Or Update By Scope REST API - https://learn.microsoft.com/en-us/rest/api/cost-management/scheduled-actions/create-or-update-by-scope?view=rest-cost-management-2025-03-01
- Microsoft Learn: Azure CLI `az costmanagement` reference - https://learn.microsoft.com/en-us/cli/azure/costmanagement?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor activity-log list` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest
- Microsoft Learn: Cost Management Query Usage REST API - https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage?view=rest-cost-management-2025-03-01

## Issues Found
- The anomaly detection delay was described only as a general 1-2 day delay. Updated it to match Microsoft documentation that anomaly detection runs about 36 hours after the end of the UTC day.
- The Cost Analysis navigation referred to a "Daily costs" view. Updated it to use Cost Analysis Smart views, which is where Microsoft documents anomaly insights.
- The portal setup implied anomaly alerts could monitor resource groups. Updated it to subscription scope, and added the required Cost Management permissions.
- The post claimed management group-level anomaly detection support in Cost Analysis. Removed that claim because Microsoft documents anomaly detection and anomaly alert creation for subscriptions.
- The Azure CLI example used `az costmanagement scheduled-action create`, which is not in the current official Azure CLI `az costmanagement` command group. Replaced it with an `az rest` example that calls the documented Scheduled Actions Create Or Update By Scope REST API.
- Updated the scheduled action ARM template API version from `2023-03-01` to the current documented `2025-03-01` version.
- The automation section said the Cost Management Query API could be used to query anomalies directly, but the example was actually applying a custom threshold to daily cost data. Updated the wording and code comments to make that distinction clear.
- Updated the Python Cost Management Query example to use the current `2025-03-01` API version, the documented `Usage` query type and `PreTaxCost` aggregation column, timezone-aware datetimes, `response.raise_for_status()`, and column-name based row indexing for `PreTaxCost` and `UsageDate`.

## Review Notes
The native anomaly alert notification is email-based and sent once at detection time. Non-email workflows still require integration through email processing, Scheduled Actions API usage, or custom analysis of cost data.
