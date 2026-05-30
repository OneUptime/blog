# Validation Summary: How to Set Up Azure Service Health Alerts for Outages Affecting Your Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Health
- Azure Monitor alerts
- Azure Monitor action groups
- Azure Activity Log alerts
- Azure CLI
- Azure Resource Manager templates
- Webhook-based incident management integrations

## Sources Consulted
- Microsoft Learn: Create Service Health alerts for Azure service notifications - https://learn.microsoft.com/en-us/azure/service-health/alerts-activity-log-service-notifications-portal
- Microsoft Learn: Azure Service Health notifications overview - https://learn.microsoft.com/en-us/Azure/service-health/service-health-notifications-properties
- Microsoft Learn: Quickstart: Create Service health alerts on service notifications using an ARM template - https://learn.microsoft.com/en-us/azure/service-health/alerts-activity-log-service-notifications-arm
- Microsoft Learn: Resource Manager template samples for Azure Monitor service health alert rules - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/resource-manager-alerts-service-health
- Microsoft Learn: az monitor activity-log alert - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest
- Microsoft Learn: az monitor action-group - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group?view=azure-cli-latest
- Microsoft Learn: az monitor action-group test-notifications - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group/test-notifications?view=azure-cli-latest
- Microsoft Learn: Microsoft.Insights/activityLogAlerts ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2026-01-01/activitylogalerts
- Microsoft Learn: Microsoft.Insights/actionGroups ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/actiongroups

## Issues Found
- The post recommended selecting only deployed services and regions and warned that selecting all regions creates noise. Microsoft documentation now recommends selecting all services and all regions because Service Health only triggers alerts when events affect resources in the subscription. Updated the setup guidance and common mistake accordingly.
- The Azure CLI action group example omitted the Global location required for action groups used by Service Health alerts. Added `--location Global`.
- The Azure CLI action group example recommended enabling Common Alert Schema later but did not enable it in the command. Added `usecommonalertschema` to the email and webhook actions.
- The Azure CLI incident-only alert example used repeated `--condition` flags. The documented syntax is a single condition expression using `and`, so the command was updated to `--condition "category=ServiceHealth and properties.incidentType=Incident"`.
- The ARM template's Health Advisory coverage omitted `ActionRequired` and `Retirement`, which are valid `properties.incidentType` values for Health Advisory notifications. Added both values to the `containsAny` list.
- The ARM deployment command used `az deployment sub create` even though the template deploys resource group-scoped `Microsoft.Insights/actionGroups` and `Microsoft.Insights/activityLogAlerts` resources. Updated it to `az deployment group create --resource-group rg-monitoring`.
- The post said multiple subscriptions could be covered by using management group scope. Service Health alert rule scopes support one subscription; Azure Policy can be assigned at management group scope to deploy alert rules across subscriptions. Updated the wording.

## Review Notes
Azure CLI was not installed in the local environment, so CLI verification was performed against Microsoft Learn command reference rather than local `az --help` output.
