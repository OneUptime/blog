# Validation Summary: How to Configure Azure App Gateway with Web App Firewall Exclusion Rules

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Application Gateway
- Azure Web Application Firewall (WAF)
- Azure WAF policies
- OWASP Core Rule Set (CRS) and Azure Default Rule Set (DRS)
- Azure CLI
- Azure Monitor / Log Analytics KQL

## Sources Consulted
- Microsoft Learn: Web Application Firewall exclusion lists in Azure Application Gateway: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-waf-configuration
- Microsoft Learn: WAF DRS and CRS rule groups and rules for Application Gateway: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules
- Microsoft Learn: Create Web Application Firewall policies for Application Gateway: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/create-waf-policy-ag
- Microsoft Learn: Azure CLI `az network application-gateway waf-config`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-config
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy managed-rule exclusion`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/managed-rule/exclusion
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy managed-rule exclusion rule-set`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/managed-rule/exclusion/rule-set
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy managed-rule rule-set`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/managed-rule/rule-set
- Microsoft Learn: Application Gateway diagnostic logs and AGWFirewallLogs reference: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics and https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/agwfirewalllogs

## Issues Found
- The post described CRS 3.2 and CRS 3.1 as the current default versions. Updated this to state that DRS 2.2 is the current recommended managed rule set and is based on OWASP CRS 3.3.4, while CRS 3.2 and CRS 3.1 are legacy versions that existing deployments may still use.
- The post implied every rule match directly blocks in Prevention mode or logs in Detection mode. Updated this to reflect Azure WAF managed rule behavior more accurately: matches are logged, and Prevention-mode blocking depends on rule action and anomaly scoring.
- Several examples used `RequestBodyPostArgNames` and `RequestBodyJsonArgNames`, which are not accepted match variables in the current Application Gateway WAF policy CLI. Replaced them with `RequestArgNames`, which Microsoft documents for request argument names including URL query string arguments, form field names, and JSON entity names.
- The WAF policy exclusion example was described as a per-rule exclusion, but the command created a global exclusion. Renamed and reworded the section so the explanation matches the command.
- The per-rule exclusion example used `--selector-match-operator`; Microsoft documentation for `exclusion rule-set add` shows `--match-operator`. Updated the command accordingly.
- The match-variable table omitted current key/value match variables and included unsupported body-specific names. Updated the table to the current documented Application Gateway WAF policy match variables.
- The disabled-rule examples used `az network application-gateway waf-policy managed-rule override add`, which is not the documented Application Gateway WAF policy command. Replaced the examples with `az network application-gateway waf-policy managed-rule rule-set update` and `--rule rule-id=... state=Disabled`.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output. The post keeps OWASP CRS 3.2 in its examples because the documented Application Gateway WAF policy CLI examples and per-rule exclusion examples use OWASP CRS 3.2; for new WAF policies, Microsoft recommends the latest DRS where available.
