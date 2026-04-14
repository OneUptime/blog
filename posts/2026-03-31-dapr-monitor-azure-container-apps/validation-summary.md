# Validation Summary: How to Monitor Dapr Applications on Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar-based microservice runtime)
- Azure Container Apps (ACA)
- Azure Monitor / Log Analytics
- Application Insights (distributed tracing)
- Azure CLI (`az containerapp`, `az monitor`)
- Kusto Query Language (KQL)

## Sources Consulted
- Azure CLI reference for `az containerapp logs`: https://learn.microsoft.com/en-us/cli/azure/containerapp/logs
- Azure CLI reference for `az containerapp env`: https://learn.microsoft.com/en-us/cli/azure/containerapp/env
- Azure Container Apps Log Analytics monitoring: https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring
- Azure Container Apps Dapr overview and limitations: https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview
- Configure Dapr on Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/enable-dapr
- Dapr middleware components reference: https://docs.dapr.io/operations/components/middleware/
- Supported metrics for Microsoft.App/containerapps: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-app-containerapps-metrics
- Azure Container Apps metrics: https://learn.microsoft.com/en-us/azure/container-apps/metrics

## Issues Found

### Issue 1 (Critical): Invalid Dapr component type for tracing in Step 3
**What was wrong:** The post used a YAML component with `componentType: middleware.http.nethttpadaptor` to configure Application Insights tracing. This component type does not exist in the Dapr middleware registry. Tracing in Dapr is not configured through components at all — it is configured through Dapr Configuration or, in ACA, at the environment level.

**What was changed:** Replaced the invalid YAML block with the correct Azure CLI approach: creating an Application Insights resource and configuring the ACA environment using `--dapr-connection-string`.

### Issue 2 (Critical): Kubernetes-style Dapr Configuration not supported on ACA in Step 3
**What was wrong:** The post showed a Kubernetes Dapr Configuration resource (`apiVersion: dapr.io/v1alpha1`, `kind: Configuration`) with a Zipkin endpoint (`http://appinsights-collector:9411/api/v2/spans`). Azure Container Apps explicitly does not support deploying Dapr Configuration spec resources — this is a documented limitation. The referenced collector endpoint also does not exist in ACA.

**What was changed:** Replaced with the correct ACA approach: passing the Application Insights connection string via `--dapr-connection-string` on `az containerapp env create` or `az containerapp env update`. This is how ACA manages Dapr tracing configuration.

### Issue 3 (Significant): Wrong metric name in alert command in Step 5
**What was wrong:** The metric alert command used `ContainerAppRequests` as the metric name. The correct metric name in the `Microsoft.App/containerapps` namespace is `Requests`.

**What was changed:** Changed `ContainerAppRequests` to `Requests`.

### Issue 4 (Moderate): Imprecise status code filter in alert condition in Step 5
**What was wrong:** The dimension filter `where StatusCode includes '5'` used the `StatusCode` dimension with a value of `'5'`, which would only match an exact status code of "5" — not 5xx errors. The `includes` operator in metric alert conditions performs exact set matching, not substring matching.

**What was changed:** Changed to `where statusCodeCategory includes 5xx`, using the `statusCodeCategory` dimension which supports category values like `2xx`, `4xx`, `5xx` for matching entire status code classes.

## Review Notes
- Steps 1, 2, 4, and 6 were verified as correct. The Log Analytics table name `ContainerAppConsoleLogs_CL` and column names with `_s` suffixes (`ContainerName_s`, `Log_s`, `ContainerAppName_s`) match the official documentation.
- The `az containerapp logs show` command with `--container daprd` and `--tail 100` is valid per the CLI reference.
- The `render timechart` operator in the KQL query (Step 4) only renders visually in the Azure Portal query editor; when run via CLI it is ignored. This is not incorrect but worth noting.
- The post uses the older `--dapr-connection-string` parameter which replaced the deprecated `--dapr-instrumentation-key` (ARM property `daprAIInstrumentationKey`). The connection string approach is the current recommended method.
