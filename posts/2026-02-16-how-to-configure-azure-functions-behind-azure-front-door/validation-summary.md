# Validation Summary: How to Configure Azure Functions Behind Azure Front Door

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions
- Azure Front Door Standard/Premium
- Azure CLI
- Azure Front Door Web Application Firewall
- Azure App Service access restrictions
- Azure Front Door caching
- C# Azure Functions isolated worker HTTP triggers

## Sources Consulted
- Azure Front Door CLI quickstart: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Azure Front Door origin and origin group concepts: https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Secure traffic to Azure Front Door origins: https://learn.microsoft.com/en-us/azure/frontdoor/origin-security
- Azure CLI `az afd route` reference: https://learn.microsoft.com/en-us/cli/azure/afd/route
- Azure CLI `az afd origin` reference: https://learn.microsoft.com/en-us/cli/azure/afd/origin
- Azure CLI `az afd origin-group` reference: https://learn.microsoft.com/en-us/cli/azure/afd/origin-group
- Azure CLI `az afd custom-domain` reference: https://learn.microsoft.com/en-us/cli/azure/afd/custom-domain
- Azure CLI `az afd security-policy` reference: https://learn.microsoft.com/en-us/cli/azure/afd/security-policy
- Azure CLI `az functionapp config access-restriction` reference: https://learn.microsoft.com/en-us/cli/azure/functionapp/config/access-restriction
- Azure CLI `az network front-door waf-policy managed-rules` reference: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/managed-rules
- Azure CLI `az network front-door waf-policy rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule
- Configure a WAF rate-limit rule for Azure Front Door: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-rate-limit-configure

## Issues Found
- The custom WAF rate-limit command used `--rate-limit-duration-in-minutes`, but the current Azure CLI parameter is `--rate-limit-duration`. I changed the flag to the documented name.
- The custom WAF rate-limit example created a rule without the required match-condition flow. Microsoft documents creating the rate-limit rule with `--defer`, then adding a match condition with `az network front-door waf-policy rule match-condition add`. I updated the snippet to use that workflow and match API requests under `/api/`.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages and Azure Front Door documentation. The Azure Front Door Standard/Premium `az afd` commands, origin locking with `AzureFrontDoor.Backend` plus `x-azure-fdid`, custom domain configuration, route caching flags, and WAF security policy association matched current official documentation.
