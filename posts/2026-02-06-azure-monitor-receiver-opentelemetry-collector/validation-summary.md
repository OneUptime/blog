# Validation Summary: How to Configure the Azure Monitor Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Azure Monitor Receiver
- Azure Authenticator extension
- Azure Monitor exporter
- Azure Event Hub receiver
- Azure CLI
- Azure Monitor Metrics
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib Azure Monitor Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/azuremonitorreceiver
- OpenTelemetry Collector Contrib Azure Authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/azureauthextension
- OpenTelemetry Collector Contrib Azure Monitor exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter
- OpenTelemetry Collector Contrib Azure Event Hub receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/azureeventhubreceiver
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Microsoft Learn Azure CLI `az vm identity`: https://learn.microsoft.com/en-us/cli/azure/vm/identity
- Microsoft Learn Azure CLI `az aks update`: https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn Azure CLI `az ad sp create-for-rbac`: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn Azure built-in roles for Monitor: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/monitor
- Microsoft Learn Azure Monitor supported metrics for virtual machines: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Microsoft Learn Azure Monitor supported metrics for AKS managed clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerservice-managedclusters-metrics
- Microsoft Learn Azure Monitor supported metrics for SQL databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics
- Microsoft Learn Azure Monitor supported metrics for storage accounts: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Microsoft Learn Azure Monitor supported metrics for App Service: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics

## Issues Found
- The post claimed the Azure Monitor Receiver collects both metrics and logs, including KQL queries from Log Analytics workspaces. The official receiver supports metrics only. Updated the description, architecture, capabilities, prerequisites, conclusion, and Log Analytics section to describe metrics-only receiver behavior and point log ingestion to Azure Event Hub receiver or Azure Monitor OTLP ingestion paths.
- The receiver component name and schema were incorrect. Replaced `azuremonitor` receiver examples with `azure_monitor`, `subscription_ids`, `services`, and the documented `metrics` namespace map.
- The authentication examples used a non-current inline `auth.type` schema. Updated examples to use the Azure Authenticator extension with `auth.authenticator: azure_auth` for managed identity and service principal authentication.
- The examples used unsupported `resource_tags` and per-resource `resources` / `resource_id` configuration. Replaced these with documented resource group and service filters, plus `append_tags_as_attributes` where tags are added as attributes rather than used as selectors.
- The production example used an invalid Azure Monitor exporter configuration with `workspace_id` and `instrumentation_key`. Updated it to use the documented `connection_string` setting.
- The post used deprecated/ignored internal telemetry `service.telemetry.metrics.address`. Removed that field and kept the current `level` setting.
- The health check example used `check_collector_pipeline`, which the official health check extension warns is not working as expected. Removed that unsupported recommendation.
- Several metric names or aggregations were inaccurate for current Azure Monitor metric references. Updated AKS `node_network_*` aggregations to `Average` and App Service response time to the REST API metric name `HttpResponseTime`.
- The troubleshooting section suggested unsupported `batch_size` receiver configuration. Replaced it with the receiver's documented `use_batch_api` and `maximum_resources_per_batch` settings.

## Review Notes
The Azure Monitor Receiver is alpha for metrics in OpenTelemetry Collector Contrib. The post now avoids a specific minimum Collector version because the current receiver naming changed recently and availability depends on the distribution version.
