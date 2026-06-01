# Validation Summary: How to Create and Manage Action Groups in Azure Monitor for Alert Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor
- Azure Monitor action groups
- Azure Monitor alert processing rules
- Azure CLI
- Azure Resource Manager templates
- Common alert schema
- Webhooks, Azure Functions, Logic Apps, Automation Runbooks, ITSM, and Event Hubs

## Sources Consulted
- Microsoft Learn: Create and manage action groups in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups
- Microsoft Learn: Common alert schema for Azure Monitor alerts - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema
- Microsoft Learn: Azure CLI `az monitor action-group` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Microsoft Learn: Azure CLI `az monitor action-group test-notifications` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group/test-notifications
- Microsoft Learn: Azure Monitor service limits - https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/service-limits
- Microsoft Learn: Microsoft.Insights/actionGroups ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/actiongroups
- Microsoft Learn: Alert processing rules for Azure Monitor alerts - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-processing-rules
- Microsoft Learn: Azure CLI `az monitor alert-processing-rule` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/alert-processing-rule

## Issues Found
- The Azure CLI action group creation example did not enable the common alert schema even though the post recommends enabling it. Added `usecommonalertschema` to the email and webhook actions.
- The rate limits section incorrectly described email throttling as per action group and webhook throttling as 10 calls per action group per minute. Updated email throttling to per email address per region, clarified webhook action count and per-subscription call limits, and noted retry behavior for retryable failures.
- The portal testing instructions said the test sends through all configured actions. Current Azure portal behavior lets you choose the sample type and notification/action types to test. Updated the wording.
- The CLI test example omitted the common alert schema flag and used the longer action group alias. Updated the example to use `--action-group` and `usecommonalertschema`.
- The alert processing rule example mixed a daily recurrence flag with a one-off maintenance window. Removed the recurrence flag and added an explicit schedule time zone.

## Review Notes
- The local environment does not have the Azure CLI installed, so CLI commands were verified against Microsoft Learn's current Azure CLI reference rather than local `az --help`.
- The ARM template uses API version `2023-01-01`, which remains documented for `Microsoft.Insights/actionGroups`; newer preview API versions also exist.
