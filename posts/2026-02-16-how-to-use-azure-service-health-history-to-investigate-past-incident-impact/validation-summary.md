# Validation Summary: How to Use Azure Service Health History to Investigate Past Incident Impact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Health
- Azure Resource Health REST API
- Azure Monitor Activity Log
- Azure Monitor Metrics
- Azure CLI
- Azure Logic Apps

## Sources Consulted
- Azure Service Health Health history overview: https://learn.microsoft.com/en-us/azure/service-health/health-history-overview
- Azure Resource Health Events - List By Subscription Id REST API: https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2025-05-01
- Azure Resource Health Availability Statuses - List REST API: https://learn.microsoft.com/en-us/rest/api/resourcehealth/availability-statuses/list?view=rest-resourcehealth-2025-05-01
- Azure Activity Log event schema: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log-schema
- Azure CLI `az monitor activity-log` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest
- Azure CLI `az monitor metrics` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest
- Azure Service Health notifications properties: https://learn.microsoft.com/en-us/azure/service-health/service-health-notifications-properties

## Issues Found
- The Resource Health Events REST example used `properties.impactStartTime ge 2026-01-17` inside `$filter`. The official Events API documents `queryStartTime` as the query parameter for returning events from a point in time based on `lastUpdateTime`, so the command was changed to use `queryStartTime=2026-01-17`. The event type filter was also adjusted to the ARM property-path form `properties/eventType`.
- The Resource Health REST snippets used older API versions, including a preview API version for availability statuses. They were updated to the current documented `2025-05-01` API version for both events and availability status history examples.

## Review Notes
Azure CLI was not installed in the local environment, so CLI command syntax was checked against Microsoft Learn rather than local `az --help` output. The Azure Monitor Metrics command in the post uses `--metric`; Microsoft Learn documents the equivalent metric-name option in examples, while the generated command synopsis lists `--metrics`, so this was left unchanged as it matches official examples.
