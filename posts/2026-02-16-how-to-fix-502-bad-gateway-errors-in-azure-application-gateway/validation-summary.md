# Validation Summary: How to Fix '502 Bad Gateway' Errors in Azure Application Gateway

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Application Gateway
- Azure Network Security Groups
- Azure Monitor diagnostic settings
- Log Analytics and Kusto Query Language
- Azure CLI
- TLS certificates for HTTPS backends
- curl, netcat, and OpenSSL

## Sources Consulted
- Microsoft Learn: Troubleshoot bad gateway (502) errors in Azure Application Gateway - https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/application-gateway-troubleshooting-502
- Microsoft Learn: Troubleshoot backend health issues in Application Gateway - https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/application-gateway-backend-health-troubleshooting
- Microsoft Learn: Azure Application Gateway infrastructure configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Microsoft Learn: Azure Application Gateway Backend Settings configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-http-settings
- Microsoft Learn: Diagnostic logs for Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Microsoft Learn: Monitoring data reference for Azure Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/monitor-application-gateway-reference
- Microsoft Learn: Azure CLI az network application-gateway http-settings - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Microsoft Learn: Azure CLI az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure CLI az network nsg rule - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule

## Issues Found
- Health probe status-code guidance was too narrow. The post said probe paths must return 200 OK and treated a 302 redirect as a likely failure. Microsoft documentation states Application Gateway considers HTTP 200-399 healthy by default. Updated the text to describe healthy status-code matching and replaced the 302 example with protected-page responses that return 401 or 403.
- Backend certificate hostname matching was imprecise. Microsoft documentation validates the certificate subject against the SNI value sent by Application Gateway. Updated the wording to mention SNI and host-name override behavior.
- Request timeout behavior was incorrect for v2. The post said backend timeout returns 502 for both v1 and v2. Microsoft documentation states v1 returns 502, while v2 retries another backend pool member and returns 504 if the retry also fails. Updated the timeout explanation.
- Diagnostic logging guidance implied Performance log applies equally to v2. Microsoft documentation states Performance log is available only for v1 and v2 should use Azure Monitor metrics for performance data. Updated the diagnostics section and command comment.
- The Log Analytics query used non-current access-log field names for backend details. Updated the projection to use documented Application Gateway access-log fields such as `serverRouted_s`, `serverStatus_s`, and `error_info_s`.
- Subnet sizing guidance incorrectly called `/26` the minimum practical size for v2. Microsoft recommends `/24` for Standard_v2 and WAF_v2 and `/26` for v1 Standard or WAF. Updated the subnet-size paragraph.

## Review Notes
The Azure CLI examples use current command groups and parameters, but the local environment does not have `az` installed, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
