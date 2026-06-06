# Validation Summary: How to Configure the Azure Monitor Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Azure Monitor exporter
- OpenTelemetry filter, batch, tail sampling, probabilistic sampling, resource processors
- OpenTelemetry span metrics connector
- Azure Monitor and Application Insights
- Azure CLI
- Azure Monitor Private Link Scope
- Kusto Query Language (KQL)

## Sources Consulted
- OpenTelemetry Collector Contrib Azure Monitor exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuremonitorexporter/README.md
- OpenTelemetry Collector Contrib Azure Monitor exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuremonitorexporter/config.go
- OpenTelemetry Collector Contrib Azure Monitor exporter authentication notes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuremonitorexporter/AUTHENTICATION.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Azure CLI Application Insights component docs: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Azure CLI metric alert docs: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure CLI Azure Monitor Private Link Scope docs: https://learn.microsoft.com/en-us/cli/azure/monitor/private-link-scope
- Azure Monitor Application Insights connection string docs: https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings

## Issues Found
- The Azure Monitor exporter examples used `max_batch_size`, which is not a valid exporter field. Changed it to the documented `maxbatchsize`.
- The advanced and production exporter examples included `retry_on_failure`, which the Azure Monitor exporter does not expose. Removed that block.
- The advanced example included `disable_offline_storage`, which is not an Azure Monitor Collector exporter option. Replaced it with documented Azure Monitor exporter options for span events and exception records.
- Collector environment variable references used the older `${VAR}` form. Updated Collector configuration snippets to `${env:VAR}`.
- The filtering examples used the deprecated `traces.span` filter processor shape. Updated them to current `trace_conditions` OTTL syntax with `error_mode: ignore`.
- The OpenTelemetry-to-Azure Monitor mapping incorrectly described root spans as requests and child spans as dependencies. Updated it to match the exporter mapping based on `SpanKind`.
- The sovereign cloud section duplicated endpoint overrides while using connection strings. Updated it to recommend region-specific connection strings, which carry endpoint information.
- The Azure metric alert commands used the nonexistent `--action-group` option. Replaced it with the documented `--action` option and an action group resource ID.
- The managed identity guidance implied direct managed identity support in the exporter. Updated it to describe the supported authenticator-extension/proxy approach for Microsoft Entra authentication.
- The Private Link command targeted the Application Insights component directly. Replaced it with the documented Azure Monitor Private Link Scope flow: create AMPLS, add the Application Insights resource as a scoped resource, then create a private endpoint to the AMPLS.
- The production example used the removed spanmetrics processor pattern. Replaced it with the current `span_metrics` connector and added a `metrics/spanmetrics` pipeline.
- The production example used `service.telemetry.metrics.address`, which is ignored in current Collectors. Replaced it with the documented Prometheus pull reader configuration.
- The troubleshooting section said a connection string might be expired. Application Insights connection strings contain instrumentation keys and do not expire in that sense, so the wording now says to verify that the string points to the expected resource.

## Review Notes
The post is now technically valid for current OpenTelemetry Collector Contrib behavior as of 2026-06-06. Some examples still use older HTTP semantic convention attributes such as `http.target`; those can be valid for existing instrumentation, but future updates could mention newer attributes such as `url.path` or `http.route` where appropriate.
