# Validation Summary: How to Configure Azure Application Gateway WAF to Block SQL Injection Attacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway
- Azure Web Application Firewall (WAF)
- Azure WAF managed rule sets / Default Rule Set (DRS)
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics / KQL
- SQL injection protection

## Sources Consulted
- Microsoft Learn: Web Application Firewall DRS and CRS rule groups and rules: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules
- Microsoft Learn: Azure Web Application Firewall policy overview: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/policy-overview
- Microsoft Learn: Create Web Application Firewall policies for Application Gateway: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/create-waf-policy-ag
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy managed-rule rule-set`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/managed-rule/rule-set
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy policy-setting`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/policy-setting
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy custom-rule match-condition`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/custom-rule/match-condition
- Microsoft Learn: Azure CLI `az network application-gateway waf-policy managed-rule exclusion`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/managed-rule/exclusion
- Microsoft Learn: Diagnostic logs for Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Microsoft Learn: Use Log Analytics to examine Application Gateway logs: https://learn.microsoft.com/en-us/azure/application-gateway/log-analytics
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The post described OWASP CRS 3.2 as the latest stable/recommended rule set for new policies. Microsoft currently recommends Default Rule Set (DRS) 2.2 for Application Gateway WAF. Updated the post to use `--type Microsoft_DefaultRuleSet --version 2.2` and adjusted the surrounding explanation.
- The SQL injection rule group names were legacy CRS names. Updated the managed-rule discussion and KQL query to use DRS 2.2 group names such as `SQLI` and `MS-ThreatIntel-SQLI`.
- The custom rule applied the `Lowercase` transform but used uppercase match values. Updated the match values to lowercase so the transformed input is compared consistently.
- The exclusion example comment said it excluded a request header, but `RequestArgNames` excludes a request argument name. Updated the comment to match the command.
- The wrap-up still referred to enabling OWASP 3.2. Updated it to DRS 2.2.

## Review Notes
- Azure CLI is not installed in this workspace, so commands could not be tested locally with `az --help`; they were verified against current Microsoft Learn CLI reference pages instead.
- The diagnostic settings command writes to the legacy `AzureDiagnostics` schema unless resource-specific export is enabled. The post's KQL query is therefore appropriate for the shown command, but future revisions could mention the `AGWFirewallLogs` table if using resource-specific logging.
