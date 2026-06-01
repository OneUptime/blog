# Validation Summary: How to Enable Dapr Service-to-Service Invocation in Azure Container Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Apps
- Azure CLI
- Dapr service invocation
- Dapr access control configuration
- Dapr resiliency configuration
- Node.js and the Dapr JavaScript SDK
- Python requests
- Azure Monitor Log Analytics

## Sources Consulted
- Azure Container Apps Dapr configuration: https://learn.microsoft.com/en-us/azure/container-apps/enable-dapr
- Azure Container Apps service-to-service communication with Dapr: https://learn.microsoft.com/en-us/azure/container-apps/connect-apps
- Azure CLI `az containerapp create` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr JavaScript SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr service invocation access control documentation: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr resiliency overview and schema: https://docs.dapr.io/operations/resiliency/resiliency-overview/ and https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr retry and circuit breaker policy documentation: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/ and https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Azure Monitor ContainerAppConsoleLogs table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerappconsolelogs
- Azure Container Apps OpenTelemetry documentation: https://learn.microsoft.com/en-us/azure/container-apps/opentelemetry-agents

## Issues Found
- The Dapr JavaScript SDK sample used `new DaprClient()` with no options. Current official SDK examples initialize the client with the Dapr sidecar host and port, so the sample now uses `new DaprClient({ daprHost, daprPort })`.
- The access control policy used `defaultAction: allow` for each caller app while claiming only specific endpoints were allowed. In Dapr access-control precedence, that app-level default would allow other operations from the matching app. Changed each caller policy to `defaultAction: deny` so only the listed operations are allowed.
- The text called the access-control object a Dapr "configuration component." It is a Dapr `Configuration` resource, so the wording was corrected.
- The monitoring section described Log Analytics console-log queries as distributed traces and used legacy custom-log table/column names. Updated the text to distinguish Dapr traces from sidecar logs, note that API logging must be enabled for invocation log lines, and changed the Kusto query to use the current `ContainerAppConsoleLogs` table schema.

## Review Notes
The Azure CLI Dapr flags, Dapr service invocation URL format, access-control fields, resiliency YAML structure, retry and circuit-breaker policy fields, and general Azure Container Apps Dapr service-invocation explanation were otherwise consistent with official documentation. Azure Container Apps Dapr tracing depends on Application Insights or OpenTelemetry configuration; the post now avoids implying that trace export happens just from enabling Dapr.
