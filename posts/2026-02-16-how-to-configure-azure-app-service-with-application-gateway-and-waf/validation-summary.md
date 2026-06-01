# Validation Summary: How to Configure Azure App Service with Application Gateway and WAF

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Application Gateway
- Azure Web Application Firewall
- Azure Virtual Network and service endpoints
- Azure CLI
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Learn: Configure App Service with Application Gateway, https://learn.microsoft.com/en-us/azure/application-gateway/configure-web-app
- Microsoft Learn: Application Gateway integration with Azure App Service, https://learn.microsoft.com/en-us/azure/app-service/overview-app-gateway-integration
- Microsoft Learn: App Service access restrictions, https://learn.microsoft.com/en-us/azure/app-service/overview-access-restrictions
- Microsoft Learn: Azure CLI `az network application-gateway`, https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: Azure CLI `az network application-gateway http-settings`, https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Microsoft Learn: Azure CLI `az network application-gateway probe`, https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy`, https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy
- Microsoft Learn: Azure CLI `az webapp config access-restriction`, https://learn.microsoft.com/en-us/cli/azure/webapp/config/access-restriction
- Microsoft Learn: Azure CLI `az network vnet subnet`, https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: Azure WAF CRS and DRS rule groups, https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules

## Issues Found
- The initial Application Gateway command used `--frontend-port 443` without creating or attaching a frontend TLS certificate. I changed the initial listener to port 80 so the basic gateway creation command matches the available parameters, leaving HTTPS frontend setup to the custom domain and SSL section.
- The WAF policy section said it configured OWASP CRS 3.2, but the command did not specify that ruleset and current Microsoft guidance recommends Default Rule Set 2.1 for new policies. I made the WAF policy creation explicit with `--type Microsoft_DefaultRuleSet --version 2.1` and adjusted the surrounding text.
- The WAF policy settings command used outdated option names, `--max-request-body-size-kb` and `--file-upload-limit-mb`. I updated them to the current Azure CLI options, `--max-request-body-size-in-kb` and `--file-upload-limit-in-mb`.
- The App Service access restriction section attempted to allow traffic from the Application Gateway subnet but did not enable the `Microsoft.Web` service endpoint required for subnet-based App Service restrictions. I replaced the unused public IP lookup with a subnet update command enabling the service endpoint.
- The HTTPS listener example reused the default frontend port name, which was created for the initial listener. I added an explicit frontend port named `https-port` on port 443 and updated the listener command to use it.

## Review Notes
The article uses the public App Service hostname as the backend and overrides the Host header, which is valid for a simple default-domain setup. Microsoft recommends using the same custom domain on both Application Gateway and App Service for production-grade host name preservation when feasible, especially for apps using App Service authentication or session affinity.
