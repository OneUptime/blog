# Validation Summary: How to Deploy Azure Front Door with WAF Policies Using Bicep Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Front Door Premium
- Azure Web Application Firewall on Azure Front Door
- Azure Bicep
- Azure Resource Manager deployments
- Azure CLI

## Sources Consulted
- Microsoft Learn: Azure Web Application Firewall on Azure Front Door - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/afds-overview
- Microsoft Learn: Web Application Firewall on Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/web-application-firewall
- Microsoft Learn: Microsoft.Cdn/profiles Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/2024-02-01/profiles
- Microsoft Learn: Microsoft.Cdn/profiles/afdEndpoints Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/2024-02-01/profiles/afdendpoints
- Microsoft Learn: Microsoft.Cdn/profiles/originGroups Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/2024-02-01/profiles/origingroups
- Microsoft Learn: Microsoft.Cdn/profiles/originGroups/origins Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/2024-02-01/profiles/origingroups/origins
- Microsoft Learn: Microsoft.Cdn/profiles/afdEndpoints/routes Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/profiles/afdendpoints/routes
- Microsoft Learn: Microsoft.Cdn/profiles/securityPolicies Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/profiles/securitypolicies
- Microsoft Learn: Microsoft.Network/FrontDoorWebApplicationFirewallPolicies Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-02-01/frontdoorwebapplicationfirewallpolicies
- Microsoft Learn: Deploy ARM templates and Bicep files with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli

## Issues Found
- The post described the template as suitable for Azure Front Door Standard or Premium while the WAF policy includes managed rule sets. Microsoft documentation states Azure Front Door Standard supports only custom WAF rules, while managed rules require Premium. I changed the description and SKU parameter to Premium-only for this managed-rules example.
- The opening paragraph implied WAF policies provide DDoS protection. Azure Front Door provides platform-level DDoS protection; WAF provides application-layer inspection, bot mitigation, and custom/managed rule enforcement. I adjusted the wording to separate those responsibilities.
- The WAF section called the rule set an "OWASP managed rule set." The template uses `Microsoft_DefaultRuleSet`, which is Azure's managed Default Rule Set based on OWASP CRS with Microsoft threat intelligence. I changed the wording to "Azure-managed Default Rule Set."
- The API route enabled `httpsRedirect` but only listed `Https` in `supportedProtocols`. I added `Http` so HTTP API requests can match the route and be redirected to HTTPS.

## Review Notes
The concatenated Bicep snippets compile with Bicep CLI 0.43.8. The only compiler warning is that the `location` parameter is declared but unused; this is harmless in the post because all Front Door resources shown use `global`.
