# Validation Summary: How to Troubleshoot Azure Web Application Firewall False Positives in Front Door

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Front Door
- Azure Web Application Firewall
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics and KQL

## Sources Consulted
- Azure Web Application Firewall DRS rule groups and rules: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-drs
- Tune Azure Web Application Firewall for Azure Front Door: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-tuning
- Web application firewall exclusion lists in Azure Front Door: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-exclusion
- Azure Web Application Firewall monitoring and logging: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-monitor
- Azure CLI reference for Front Door WAF managed rules exclusions: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/managed-rules/exclusion
- Azure CLI reference for Front Door WAF managed rules overrides: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/managed-rules/override
- Azure CLI reference for Front Door WAF custom rules: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule
- Azure CLI reference for Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The managed-rule exclusion example used the outdated/nonexistent `az network front-door waf-policy managed-rule-set rule-group-override create` command and mixed an exclusion with a per-rule action. Changed it to the current `az network front-door waf-policy managed-rules exclusion add` command with `--match-variable`, `--operator`, and `--value`.
- The per-rule action example used the same outdated/nonexistent command group. Changed it to `az network front-door waf-policy managed-rules override add`, which is the current Azure CLI command for managed rule overrides.
- The custom rule example used `az network front-door waf-policy custom-rule create`, which is not the current command group. Changed it to `az network front-door waf-policy rule create` with `--match-variable RequestUri`, `--operator Contains`, and `--values /api/webhooks`.
- The KQL examples filtered only `action_s == "Block"`. Azure documentation shows action values can vary by casing and wording, so the filters now use `action_s in~ ("Block", "Blocked")`.
- The managed rule set overview implied managed rules apply to all Azure Front Door WAF SKUs. Clarified that managed rule sets apply to Azure Front Door Premium and Front Door classic tiers.
- The rollout guidance suggested switching individual rule groups to prevention mode. Azure WAF policy mode is set at the policy level, while rule behavior is tuned through rule actions and overrides. Updated the steps to reflect switching the policy to prevention mode and then moving overridden rules or groups from Log to Block gradually.

## Review Notes
The Azure CLI was not installed locally in the workspace, so command validation was performed against current Microsoft Learn Azure CLI reference pages instead of local `az --help` output. The post uses the legacy `AzureDiagnostics` table shape, which remains documented for Azure Front Door WAF logs; resource-specific tables may be preferable for new deployments depending on diagnostic settings.
