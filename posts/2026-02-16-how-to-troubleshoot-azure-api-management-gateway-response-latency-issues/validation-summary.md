# Validation Summary: How to Troubleshoot Azure API Management Gateway Response Latency Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure API Management
- Azure Monitor diagnostic settings and metrics
- Log Analytics and KQL
- Azure CLI
- API Management policies: validate-jwt, send-request, cache-lookup-value, cache-store-value, cache-lookup, cache-store
- API Management request tracing

## Sources Consulted
- Microsoft Learn: Azure Monitor Logs reference for ApiManagementGatewayLogs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apimanagementgatewaylogs
- Microsoft Learn: Supported log categories for Microsoft.ApiManagement/service - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-apimanagement-service-logs
- Microsoft Learn: Supported metrics for Microsoft.ApiManagement/service - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-apimanagement-service-metrics
- Microsoft Learn: Debug APIs in Azure API Management using request tracing - https://learn.microsoft.com/en-au/azure/api-management/api-management-howto-api-inspector
- Microsoft Learn: Azure API Management validate-jwt policy - https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: Azure API Management cache-lookup policy - https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy
- Microsoft Learn: Custom caching in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-sample-cache-by-key
- Microsoft Learn: Azure API Management capacity metrics - https://learn.microsoft.com/en-us/azure/api-management/api-management-capacity
- Microsoft Learn: Azure API Management v2 tiers - https://learn.microsoft.com/en-us/azure/api-management/v2-service-tiers-overview
- Microsoft Learn: Azure CLI az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The KQL latency breakdown used a non-existent `ResponseTime` column. Changed it to `TotalTime`, which is the documented gateway log column, and kept `BackendTime` for backend latency.
- The request tracing example used the deprecated and unsupported `Ocp-Apim-Trace` header and described a trace URL response header. Replaced it with the current debug-token flow using `listDebugCredentials`, `Apim-Debug-Authorization`, `Apim-Trace-Id`, and `listTrace`.
- The JWT section implied that OpenID/JWKS validation performs a network call on every request. Updated it to explain APIM's documented OpenID configuration and JWKS caching behavior.
- The cache-value policy sample used XML attribute quoting that could break when copied into an XML policy document. Changed the affected attributes to use single quotes around APIM policy expressions.
- The APIM capacity section described only the classic `Capacity` metric and classic SKU limits. Updated it to distinguish classic tiers from v2 tiers, including the v2 gateway CPU and memory metrics and current v2 unit limits.
- The multi-region note implied Premium generally, including v2. Updated it to specify the classic Premium tier because multi-region deployment is currently unavailable in the v2 tiers.
- The metric alert comment said p95 latency, but the command used `avg Duration`. Updated the comment to say average gateway duration.

## Review Notes
The Azure CLI binary was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output. The response-cache sample is technically valid, but production policies should include appropriate `vary-by` fields and private-response caching settings when responses vary by authorization context.
