# Validation Summary: How to Set Up Azure Front Door with Rate Limiting WAF Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure Web Application Firewall (WAF)
- Azure CLI
- Azure Monitor diagnostic logs
- KQL / AzureDiagnostics

## Sources Consulted
- Microsoft Learn: WAF rate limiting for Azure Front Door - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-rate-limit
- Microsoft Learn: Configure a WAF rate-limit rule for Azure Front Door - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-rate-limit-configure
- Microsoft Learn: Azure CLI `az network front-door waf-policy` - https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy
- Microsoft Learn: Azure CLI `az network front-door waf-policy rule` - https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule
- Microsoft Learn: Azure CLI `az network front-door waf-policy rule match-condition` - https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule/match-condition
- Microsoft Learn: Azure CLI `az afd security-policy` - https://learn.microsoft.com/en-us/cli/azure/afd/security-policy
- Microsoft Learn: Configure a custom response for Azure Front Door WAF - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-configure-custom-response-code
- Microsoft Learn: Azure Web Application Firewall monitoring and logging - https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-monitor
- Microsoft Learn: Azure Front Door routing architecture - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture
- Microsoft Learn: Configure Azure Front Door logs - https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-logs

## Issues Found
- The post described rate limiting as configurable by arbitrary grouping variables. Azure Front Door WAF rate limits are counted per source/socket IP address, while match conditions define which requests are included. Updated the explanation and terminology.
- The basic rate-limit rule had no match condition. Azure Front Door WAF custom rules require at least one match condition, so I added a Host header condition that matches normal requests.
- The Azure CLI examples used `--rate-limit-duration-in-minutes`, which is not the current Azure CLI parameter. Replaced it with `--rate-limit-duration`.
- The basic rule comment implied rate-limited requests receive 429 immediately. A custom block response is configured later, so I removed that premature status-code claim.
- The security policy example used `--name`; the documented parameter is `--security-policy-name` with `--name` as an alias. Updated the example to the documented long option.
- The caching pitfall incorrectly said cached requests do not hit WAF. Azure Front Door evaluates WAF before route/cache handling, so I corrected the note to say cache hits can still be counted by WAF rate limiting while reducing origin traffic.
- The KQL example filtered on `ResourceType == "PROFILES"`. Microsoft examples use `ResourceProvider == "MICROSOFT.CDN"` for Azure Front Door Standard/Premium WAF logs, so I updated the filter.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output.
