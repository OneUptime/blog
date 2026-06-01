# Validation Summary: How to Configure Azure Advisor Alerts for New Reliability Recommendations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Advisor
- Azure Monitor activity log alerts
- Azure Monitor action groups
- Azure Resource Manager templates
- Azure CLI
- Azure Resource Graph
- Azure Key Vault soft delete

## Sources Consulted
- Microsoft Learn: Create Azure Advisor alerts on new recommendations by using the Azure portal - https://learn.microsoft.com/en-us/azure/advisor/advisor-alerts-portal
- Microsoft Learn: Azure CLI `az monitor activity-log alert` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor action-group` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group?view=azure-cli-latest
- Microsoft Learn: Microsoft.Insights/activityLogAlerts ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2026-01-01/activitylogalerts
- Microsoft Learn: Configure a webhook to get activity log alerts - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/activity-log-alerts-webhook
- Microsoft Learn: Azure Monitor alert types - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-types
- Microsoft Learn: Azure Key Vault recovery management with soft delete and purge protection - https://learn.microsoft.com/en-us/azure/key-vault/general/key-vault-recovery
- Microsoft Learn: Azure CLI `az advisor configuration` reference - https://learn.microsoft.com/en-us/cli/azure/advisor/configuration?view=azure-cli-latest

## Issues Found
- The CLI example used `az advisor configuration create-or-update`, but the current Azure CLI exposes `az advisor configuration update`, not `create-or-update`. Removed the invalid command because it was not needed to create an Advisor activity log alert.
- The Azure CLI activity log alert examples filtered on `recommendationCategory=HighAvailability`. Advisor recommendation fields are activity log properties, so the correct condition field is `properties.recommendationCategory`. Updated all CLI alert examples and added the Advisor recommendation `operationName` condition.
- The post claimed Advisor alerts could be created for all five Advisor categories, including Security and Operational Excellence. Microsoft documentation currently states Advisor alerts are available only for High Availability, Performance, and Cost recommendations. Updated the multi-category example and related explanatory text.
- The best-practices section recommended Advisor alerts for Security. Updated it to recommend reliability alerts and separate Defender for Cloud / Azure Monitor alerting for security recommendations.
- The monitoring section described the Azure Resource Graph example as exporting Advisor recommendations to Log Analytics. Updated the wording and code comment to describe it as querying current recommendations with Azure Resource Graph.

## Review Notes
- The Azure CLI binary was not installed in the local environment, so command verification was performed against the current official Microsoft Learn CLI reference instead of local `az --help` output.
- The ARM template resource shape and Advisor recommendation activity log fields matched official Microsoft documentation.
