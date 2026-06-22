# Validation Summary: How to Configure Azure Front Door

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure CLI
- Azure Web Application Firewall on Azure Front Door
- Azure Front Door custom domains and managed certificates
- Azure Front Door rule sets and caching
- Azure Monitor diagnostic settings
- Log Analytics and Kusto Query Language

## Sources Consulted
- Microsoft Learn: Quickstart: Create an Azure Front Door using Azure CLI - https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Microsoft Learn: Azure Web Application Firewall on Azure Front Door - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/afds-overview
- Microsoft Learn: Web Application Firewall DRS rule groups and rules - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-drs
- Microsoft Learn: Azure CLI `az afd profile` reference - https://learn.microsoft.com/en-us/cli/azure/afd/profile
- Microsoft Learn: Azure CLI `az afd route` reference - https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Azure CLI `az afd custom-domain` reference - https://learn.microsoft.com/en-us/cli/azure/afd/custom-domain
- Microsoft Learn: Azure CLI `az afd security-policy` reference - https://learn.microsoft.com/en-us/cli/azure/afd/security-policy
- Microsoft Learn: Azure CLI `az network front-door waf-policy` reference - https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy
- Microsoft Learn: Azure CLI `az network front-door waf-policy managed-rules` reference - https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/managed-rules
- Microsoft Learn: Azure CLI `az network front-door waf-policy rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule
- Microsoft Learn: Azure CLI `az afd rule` reference - https://learn.microsoft.com/en-us/cli/azure/afd/rule
- Microsoft Learn: Rule set actions in Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-rules-engine-actions
- Microsoft Learn: Caching with Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Microsoft Learn: Monitor Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door
- Microsoft Learn: Example AzureDiagnostics queries - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/azurediagnostics

## Issues Found
- The post created a Standard Azure Front Door profile and Standard WAF policy, then configured managed WAF rule sets and Bot Manager. Managed WAF rule sets are available with Azure Front Door Premium; Standard supports custom WAF rules only. Updated the profile and WAF policy examples to use `Premium_AzureFrontDoor` and clarified the tier description.
- The route used `--supported-protocols Https` with `--https-redirect Enabled`. HTTP-to-HTTPS redirect requires the route to accept HTTP requests. Updated the route to `--supported-protocols Http Https`.
- The managed default WAF rule set example used the older `DefaultRuleSet` type and version `1.0`. Updated it to the current Microsoft-managed rule set type `Microsoft_DefaultRuleSet` with version `2.2` and explicit `--action Block`.
- The rate limiting command used `--rate-limit-duration-in-minutes`, but the current Azure CLI reference uses `--rate-limit-duration`. Updated the flag.
- The caching rule set was created but not associated with the route, so the rules would not run. Added an `az afd route update --rule-sets CachingRules` command.
- The static asset cache rule used `--cache-behavior Override`, which is not the current rule set cache behavior value. Updated it to `OverrideAlways` and changed the duration to `168:00:00`, matching the CLI time format.
- The Log Analytics queries filtered on `ResourceType == "FRONTDOORS"`, which is the classic Front Door pattern. Updated the Standard/Premium queries to filter on `ResourceProvider == "MICROSOFT.CDN"` and the relevant Front Door log category. Also converted `httpStatusCode_s` to an integer before comparing it with `400`.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn Azure CLI reference pages and Azure Front Door product documentation rather than local `az --help` output.
