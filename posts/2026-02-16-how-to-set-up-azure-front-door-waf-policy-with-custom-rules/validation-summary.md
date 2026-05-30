# Validation Summary: How to Set Up Azure Front Door WAF Policy with Custom Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure Web Application Firewall (WAF)
- Azure CLI
- WAF custom rules
- Rate limiting
- Geo-filtering
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Microsoft Learn: Azure CLI `az network front-door waf-policy` reference, https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy
- Microsoft Learn: Azure CLI `az network front-door waf-policy rule` reference, https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule
- Microsoft Learn: Azure CLI `az network front-door waf-policy rule match-condition` reference, https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule/match-condition
- Microsoft Learn: Azure CLI `az afd security-policy` reference, https://learn.microsoft.com/en-us/cli/azure/afd/security-policy
- Microsoft Learn: Custom rules for Azure Web Application Firewall on Azure Front Door, https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-custom-rules
- Microsoft Learn: WAF rate limiting for Azure Front Door, https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-rate-limit
- Microsoft Learn: Configure a Web Application Firewall rate-limit rule, https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-rate-limit-configure
- Microsoft Learn: Configure an IP restriction rule with a WAF for Azure Front Door, https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-configure-ip-restriction
- Microsoft Learn: Geo-filtering on a domain for Azure Front Door, https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-geo-filtering
- Microsoft Learn: Configure Azure Front Door logs, https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-logs
- Microsoft Learn: Supported log categories for Microsoft.Cdn/profiles, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-cdn-profiles-logs

## Issues Found
- Clarified that managed WAF rule sets such as OWASP are available on Azure Front Door Premium profiles, while the article otherwise discusses custom rules that can apply to Standard or Premium.
- Added the Azure Front Door CLI extension prerequisite because the `az network front-door waf-policy` commands are provided by the `front-door` extension.
- Replaced the rate-limit match-all condition with `RequestHeader.Host` and `GreaterThanOrEqual "0"`, matching Microsoft guidance for applying a rate-limit rule to all valid Front Door HTTP requests.
- Corrected the rate-limit explanation to describe Azure Front Door WAF's fixed rate-limit window behavior.
- Replaced bare `--negate` usage with `--negate true`, matching the Azure CLI parameter contract.
- Replaced invalid `--selector` arguments with selector-based match variables such as `RequestHeader.User-Agent` and `RequestHeader.X-API-Key`, which is the format required by the current Azure CLI reference.
- Changed the admin IP allow-list condition from `RemoteAddr` to `SocketAddr`, aligning with Microsoft guidance for source IP matching at the WAF edge.
- Corrected the API-key rule wording to explain that the example blocks missing or non-matching `X-API-Key` values.
- Updated the `az afd security-policy create` example to pass the WAF policy and endpoint resource IDs, which are required by the Azure CLI.
- Qualified the closing managed-rules statement with "where available" to avoid implying managed rules are available on every Front Door tier.

## Review Notes
The local environment did not have Azure CLI installed, so command validation was performed against current Microsoft Learn CLI references and Azure Front Door WAF documentation rather than local `az --help` output.
