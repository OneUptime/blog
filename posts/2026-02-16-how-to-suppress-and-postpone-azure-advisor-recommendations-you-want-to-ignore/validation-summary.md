# Validation Summary: How to Suppress and Postpone Azure Advisor Recommendations You Want to Ignore

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Azure Advisor
- Azure Advisor recommendations, suppressions, and configuration
- Azure CLI
- Azure Resource Graph / KQL
- Azure PowerShell
- Azure Advisor REST API

## Sources Consulted
- Microsoft Learn: Dismiss and postpone recommendations - Azure Advisor: https://learn.microsoft.com/en-us/azure/advisor/advisor-dismiss-postpone
- Microsoft Learn: Azure Advisor portal basics: https://learn.microsoft.com/en-us/azure/advisor/advisor-get-started
- Microsoft Learn: Advisor score - Azure Advisor: https://learn.microsoft.com/en-us/azure/advisor/azure-advisor-score
- Microsoft Learn: az advisor recommendation: https://learn.microsoft.com/en-us/cli/azure/advisor/recommendation
- Microsoft Learn: az advisor configuration: https://learn.microsoft.com/en-us/cli/azure/advisor/configuration
- Microsoft Learn: Suppressions - Create - Azure Advisor REST API: https://learn.microsoft.com/en-us/rest/api/advisor/suppressions/create
- Microsoft Learn: Advisor data in Azure Resource Graph: https://learn.microsoft.com/en-us/azure/advisor/advisor-azure-resource-graph
- Microsoft Learn: Invoke-AzRestMethod: https://learn.microsoft.com/en-us/powershell/module/az.accounts/invoke-azrestmethod

## Issues Found
- The post described Advisor configuration as subscription-level suppression for specific recommendation types. Microsoft documentation describes Advisor configuration as include/exclude settings for subscriptions or resource groups, plus VM/VMSS right-sizing CPU threshold configuration. Updated the section to describe Advisor exclusions accurately.
- The post listed postpone durations as 1 day, 7 days, 30 days, or a custom date. Current Azure Advisor documentation lists 1, 7, 30, or 90 days. Updated the description and portal steps.
- The Azure CLI list example did not show the resource ID used by `az advisor recommendation disable --ids`. Updated the query to include `id` and clarified that `name` is the recommendation GUID.
- The Advisor configuration CLI example used an empty `--resource-group` and an invalid string value for `--exclude`. Replaced it with a valid subscription-level low CPU threshold example and a valid resource-group exclusion example.
- The REST API example used a subscription-level placeholder that could be mistaken for every recommendation URI. Updated it to show the documented `{resource-id}/providers/Microsoft.Advisor/recommendations/{rec-id}/suppressions/{name}` form.
- The REST examples used a non-GUID value for `suppressionId` in one automation snippet. Updated the examples to use GUID-form values because the REST schema defines `properties.suppressionId` as a GUID.
- The PowerShell example passed a full URL to `Invoke-AzRestMethod -Path`. Microsoft documentation says `-Path` should omit the Resource Manager hostname; full URLs should use `-Uri`. Updated the command to use `-Uri`.
- The Resource Graph suppressions example labeled `properties.suppressionId` as `RecommendationId`. Updated the label to `SuppressionId`.
- The post claimed postponed recommendations still count against Advisor score. Microsoft documentation says postponed or dismissed recommendations are excluded from score calculation after the next refresh. Updated the score section and the earlier dismissal note.
- The automation script comment said it targeted resources tagged as dev, but the query filtered by resource group. Updated the comment to match the query.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was verified against current Microsoft Learn command reference rather than local `az --help`.
- The REST API examples keep `api-version=2023-01-01`, which remains documented. Microsoft Learn also documents newer Advisor API versions, so future updates may choose to move examples to the latest stable version.
