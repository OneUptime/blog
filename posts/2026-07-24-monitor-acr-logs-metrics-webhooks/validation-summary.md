# Validation Summary: Monitoring Azure Container Registry with Diagnostic Logs, Metrics, and Webhooks

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Azure Container Registry
- Azure Monitor platform metrics
- Azure Monitor diagnostic settings and resource logs
- Log Analytics and Kusto Query Language (KQL)
- Azure Activity Log
- Azure Resource Health and Service Health
- ACR Tasks
- Native ACR webhooks
- Azure Event Grid
- Azure CLI

## Sources Consulted

- [Monitor Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/monitor-container-registry)
- [Supported metrics for Microsoft.ContainerRegistry/registries](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerregistry-registries-metrics)
- [Supported logs for Microsoft.ContainerRegistry/registries](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-containerregistry-registries-logs)
- [ContainerRegistryLoginEvents table schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerregistryloginevents)
- [ContainerRegistryRepositoryEvents table schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerregistryrepositoryevents)
- [Diagnostic settings in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings)
- [Azure CLI diagnostic-settings reference](https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest)
- [Azure Activity Log](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log)
- [Configure Service Health alerts for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/set-container-registry-service-health-alerts)
- [Create Resource Health alerts](https://learn.microsoft.com/en-us/azure/service-health/resource-health-alert-arm-template-guide)
- [View and manage ACR task run logs](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-logs)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Using Azure Container Registry webhooks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook)
- [Azure Container Registry webhook schema](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook-reference)
- [Azure CLI ACR webhook reference](https://learn.microsoft.com/en-us/cli/azure/acr/webhook?view=azure-cli-latest)
- [Service tags for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-service-tag)
- [Azure Container Registry as an Event Grid source](https://learn.microsoft.com/en-us/azure/event-grid/event-schema-container-registry)
- [Check the health of an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Push and pull Helm charts to an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos)

## Issues Found

- The diagnostic-setting command routed data to a Log Analytics workspace but did not select resource-specific collection mode. Azure CLI defaults to the legacy `AzureDiagnostics` table when `--export-to-resource-specific` is omitted, while every later KQL example queries the dedicated `ContainerRegistryLoginEvents` and `ContainerRegistryRepositoryEvents` tables. Added `--export-to-resource-specific true` so the command and queries are consistent and work as described.

## Review Notes

- The seven metric names, their time grains, the `StorageUsed` aggregation and `Geolocation` dimension, and both resource-log categories match the Microsoft references current in July 2026.
- The KQL columns and the use of `ResultDescription` in the authentication- and repository-failure examples match the documented ACR schemas and Microsoft sample queries.
- The Azure CLI command names and options were also checked against the locally installed Azure CLI 2.71.0 help.
- Diagnostic-settings export flattens multidimensional metrics. Use the native Azure Monitor metric data when the `StorageUsed` `Geolocation` breakdown is required.
- The CLI and webhook API still accept `chart_push` and `chart_delete`, but legacy ACR Helm repositories and the `az acr helm` command group have been retired. Helm 3 charts should be stored as OCI artifacts, consistent with the caveat already present in the post.
