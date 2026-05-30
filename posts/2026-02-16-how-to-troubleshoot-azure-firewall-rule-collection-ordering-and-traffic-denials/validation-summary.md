# Validation Summary: How to Troubleshoot Azure Firewall Rule Collection Ordering and Traffic Denials

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics and KQL
- Azure Firewall DNS proxy
- Azure Firewall threat intelligence
- Azure Firewall Premium IDPS

## Sources Consulted
- Microsoft Learn: Azure Firewall rule processing logic - https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn: Azure Firewall FQDN filtering in network rules - https://learn.microsoft.com/en-us/azure/firewall/fqdn-filtering-network-rules
- Microsoft Learn: Azure Firewall DNS Proxy details - https://learn.microsoft.com/en-us/azure/firewall/dns-details
- Microsoft Learn: Azure Firewall DNS settings - https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Microsoft Learn: Monitor Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Microsoft Learn: Monitoring data reference for Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall-reference
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure CLI `az network firewall application-rule` - https://learn.microsoft.com/en-us/cli/azure/network/firewall/application-rule
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group` - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group
- Microsoft Learn: Azure Firewall threat intelligence configuration - https://learn.microsoft.com/en-us/azure/firewall-manager/threat-intelligence-settings
- Microsoft Learn: Azure Firewall Premium features implementation guide - https://learn.microsoft.com/en-us/azure/firewall/premium-features

## Issues Found
- The post said unmatched traffic is immediately denied by the built-in deny-all rule. Azure Firewall evaluates the built-in infrastructure rule collection after application rules and before final deny, so the wording was updated.
- The HTTPS application rule explanation said application rules simply require TLS SNI. Microsoft documents that HTTPS matches SNI only unless TLS inspection is enabled, where Host header and URL can also be used, so the explanation was corrected.
- The application rule protocol section tied HTTP and HTTPS too tightly to default ports and did not mention the MSSQL proxy-mode limitation. The wording now describes the supported application protocols and calls out MSSQL FQDN filtering on port 1433.
- The FQDN resolution scenario incorrectly implied application rules require DNS proxy. DNS proxy is required for FQDNs in network rules; application rules resolve FQDNs independently. The paragraph and CLI example were corrected.
- The DNS proxy CLI example used `--dns-proxy true`, which is not the current Azure CLI parameter. It was changed to `--enable-dns-proxy true`, and a `az network vnet update --dns-servers <firewall-private-IP>` example was added because Microsoft documents that clients should use the firewall private IP as their DNS resolver.
- The threat intelligence and IDPS section implied both features are Azure Firewall Premium-only. The wording now distinguishes Azure Firewall threat intelligence-based filtering from Premium IDPS.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output. The diagnostic log examples use legacy AzureDiagnostics categories, which are still documented, but future updates could also show resource-specific structured log tables such as `AZFWNetworkRule`, `AZFWApplicationRule`, and `AZFWThreatIntel`.
