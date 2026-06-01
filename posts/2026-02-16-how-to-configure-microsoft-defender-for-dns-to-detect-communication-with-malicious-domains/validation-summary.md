# Validation Summary: How to Configure Microsoft Defender for DNS to Detect Communication

## Status
validated

## Post Type
Tutorial / Azure security configuration guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for DNS
- Microsoft Defender for Servers Plan 2
- Azure CLI
- Microsoft Sentinel
- Azure Logic Apps
- Azure Firewall threat intelligence filtering
- Azure DNS security policy
- Azure Monitor Logs / Kusto Query Language
- Azure Network Watcher Traffic Analytics

## Sources Consulted
- Microsoft Defender for DNS overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-dns-introduction
- Microsoft Defender for Cloud DNS alert reference: https://learn.microsoft.com/en-us/azure/defender-for-cloud/alerts-dns
- Respond to Microsoft Defender for DNS alerts: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-dns-alerts
- Azure CLI `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing?view=azure-cli-latest
- Azure Defender for Cloud Pricings REST API: https://learn.microsoft.com/en-us/rest/api/defenderforcloud/pricings/get?view=rest-defenderforcloud-2024-01-01
- Azure CLI `az security contact`: https://learn.microsoft.com/en-us/cli/azure/security/contact?view=azure-cli-latest
- Azure CLI `az security alert`: https://learn.microsoft.com/en-us/cli/azure/security/alert?view=azure-cli-latest
- Azure Defender for Cloud Alerts REST API: https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list?view=rest-defenderforcloud-2022-01-01
- Azure CLI `az security automation`: https://learn.microsoft.com/en-us/cli/azure/security/automation?view=azure-cli-latest
- Microsoft.Security/automations ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.security/automations
- Azure CLI `az network firewall`: https://learn.microsoft.com/en-us/cli/azure/network/firewall?view=azure-cli-latest
- Azure Firewall threat intelligence-based filtering: https://learn.microsoft.com/en-us/azure/firewall/threat-intel
- Azure DNS security policy: https://learn.microsoft.com/en-us/azure/dns/dns-security-policy
- Azure DNS Private Resolver endpoints and rulesets: https://learn.microsoft.com/en-us/azure/dns/private-resolver-endpoints-rulesets
- Azure-provided DNS and 168.63.129.16: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/azure-dns
- Azure Monitor Logs `DnsEvents` table: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/dnsevents
- Azure Network Watcher Traffic Analytics schema: https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema

## Issues Found
- The post used the standalone `Dns` Defender pricing plan as the primary enablement path. Microsoft documentation states that, since August 1, 2023, new subscriptions receive suspicious DNS activity alerts through Defender for Servers Plan 2, while existing standalone Defender for DNS subscriptions can continue using the standalone plan. Updated Step 1 to enable `VirtualMachines` with `--subplan P2` for new subscriptions and note that `Dns` is deprecated and replaced by `VirtualMachines`.
- The security contact command used outdated flags: `--email`, `--alert-notifications on`, and `--alerts-to-admins on`. Updated it to current Azure CLI syntax using `--emails`, JSON `--alert-notifications`, and JSON `--notifications-by-role`.
- The alert query examples referenced alert fields as top-level properties. The documented Defender for Cloud alert schema exposes these values under `properties`. Updated the JMESPath examples to use `properties.alertType`, `properties.alertDisplayName`, `properties.severity`, `properties.status`, `properties.timeGeneratedUtc`, and related fields.
- The workflow automation example used `az security automation create`, which is not the current command. Updated it to `az security automation create_or_update` and adjusted the rule JPath/action payload to match the automation schema, including the Logic App `uri` field.
- The DNS blocking section described Azure DNS Private Resolver forwarding rules as a DNS security policy sinkhole. Updated it to describe Azure DNS security policy accurately: VNet-linked DNS traffic rules can allow, alert on, or block domains in domain lists or Microsoft's managed threat intelligence feed.
- The cost section described Defender for DNS as a standalone per-subscription monthly charge. Updated it to distinguish new subscriptions using Defender for Servers Plan 2 from older subscriptions that still use the standalone Defender for DNS plan.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current official Azure CLI and REST documentation rather than local `az --help` output.
