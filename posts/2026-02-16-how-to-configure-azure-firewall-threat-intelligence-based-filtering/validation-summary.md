# Validation Summary: How to Configure Azure Firewall Threat Intelligence-Based Filtering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall threat intelligence-based filtering
- Azure Firewall Premium IDPS
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics and KQL
- Azure Monitor scheduled query alerts

## Sources Consulted
- Microsoft Learn: Azure Firewall threat intelligence-based filtering: https://learn.microsoft.com/azure/firewall/threat-intel
- Microsoft Learn: Azure Firewall threat intelligence configuration: https://learn.microsoft.com/azure/firewall-manager/threat-intelligence-settings
- Microsoft Learn: Azure CLI `az network firewall`: https://learn.microsoft.com/cli/azure/network/firewall
- Microsoft Learn: Azure CLI `az network firewall policy`: https://learn.microsoft.com/cli/azure/network/firewall/policy
- Microsoft Learn: Azure Firewall monitoring data reference: https://learn.microsoft.com/azure/firewall/monitor-firewall-reference
- Microsoft Learn: Azure Monitor Logs reference for `AZFWThreatIntel`: https://learn.microsoft.com/azure/azure-monitor/reference/tables/azfwthreatintel
- Microsoft Learn: Example queries for `AZFWThreatIntel`: https://learn.microsoft.com/azure/azure-monitor/reference/queries/azfwthreatintel
- Microsoft Learn: Azure Monitor diagnostic settings: https://learn.microsoft.com/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn: Azure CLI `az monitor scheduled-query`: https://learn.microsoft.com/cli/azure/monitor/scheduled-query
- Microsoft Learn: Azure Firewall FQDN filtering in network rules: https://learn.microsoft.com/azure/firewall/fqdn-filtering-network-rules

## Issues Found
- The post described threat intelligence as automatically blocking traffic in all cases. Azure Firewall threat intelligence can run in Off, Alert only, or Alert and deny mode, so the description and opening sentence were changed to say it can alert on or block traffic.
- The Azure Firewall Policy threat intelligence allowlist command used unsupported flag names, `--threat-intel-allowlist-fqdns` and `--threat-intel-allowlist-ipaddresses`. These were changed to the current Azure CLI policy flags, `--fqdns` and `--ip-addresses`.
- The diagnostic settings example mixed legacy Azure Diagnostics categories with resource-specific Log Analytics table queries. The command now enables resource-specific export and uses resource-specific categories: `AZFWNetworkRule`, `AZFWApplicationRule`, `AZFWThreatIntel`, and `AZFWDnsQuery`.
- The KQL examples queried a non-table name, `AzureFirewallThreatIntelLog`, and used legacy-style column names such as `SourceIP` and `DestinationIP`. They were updated to query `AZFWThreatIntel` with the documented column names `SourceIp` and `DestinationIp`.
- The scheduled query alert example placed a full KQL query directly in the `--condition` expression. It was changed to use a query placeholder with `--condition-query`, which matches the current Azure CLI syntax for `az monitor scheduled-query create`.
- The limitation "FQDN-based filtering requires DNS proxy" was too broad. It was narrowed to FQDN filtering in network rules, which is the documented DNS proxy requirement.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help` output.
