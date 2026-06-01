# Validation Summary: How to Configure Azure Application Gateway with Cookie-Based Session Affinity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway
- Azure CLI
- Cookie-based session affinity
- Azure Monitor diagnostic settings and Log Analytics
- Azure Managed Redis

## Sources Consulted
- Azure Application Gateway backend settings configuration: https://learn.microsoft.com/en-us/azure/application-gateway/configuration-http-settings
- Troubleshoot Azure Application Gateway session affinity issues: https://learn.microsoft.com/en-us/azure/application-gateway/how-to-troubleshoot-application-gateway-session-affinity-issues
- Azure CLI reference for Application Gateway HTTP settings: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Azure CLI reference for Application Gateway URL path maps: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/url-path-map
- Azure CLI URL path routing tutorial for Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-url-route-cli
- Diagnostic logs for Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Monitoring data reference for Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/monitor-application-gateway-reference
- Azure Monitor diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure Cache for Redis retirement notice: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Azure Managed Redis CLI guidance: https://learn.microsoft.com/en-us/azure/redis/scripts/create-manage-cache?pivots=azure-managed-redis

## Issues Found
- The post incorrectly described `ApplicationGatewayAffinity` as the v1 cookie and `ApplicationGatewayAffinityCORS` as the v2 cookie. Microsoft documentation states that v1 uses `ARRAffinity`, v2 uses `ApplicationGatewayAffinity`, and the `ApplicationGatewayAffinityCORS` cookie is added in addition to the regular affinity cookie for CORS scenarios. Updated the explanation accordingly.
- The sample `Set-Cookie` output included `HttpOnly`, and the cookie properties section stated that `HttpOnly` and `Secure` are set by default. Microsoft documentation notes that the gateway-managed affinity cookie can be flagged by scanners because Secure or HttpOnly flags are not set, and provides a separate rewrite-rule article for adding those flags. Updated the sample and cookie properties.
- The SameSite description was too broad. Updated it to distinguish the regular affinity cookie, which omits SameSite and is treated as Lax by modern browsers, from the CORS affinity cookie, which includes `SameSite=None; Secure`.
- The externalized session state example used `az redis create` for Azure Cache for Redis. Azure Cache for Redis has a retirement timeline and Microsoft recommends Azure Managed Redis for new work. Replaced the example with `az redisenterprise create` using an Azure Managed Redis SKU.

## Review Notes
The Application Gateway CLI commands and flags reviewed in the post are current in the Microsoft Azure CLI reference. The Log Analytics examples use the legacy `AzureDiagnostics` table, which remains supported; for new diagnostic settings, Microsoft recommends resource-specific tables such as `AGWAccessLogs`, so a future post update could add equivalent resource-specific queries.
