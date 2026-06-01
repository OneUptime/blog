# Validation Summary: How to Configure Azure Firewall DNAT Rules for Inbound Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Firewall
- Azure Firewall DNAT rules
- Azure Firewall Policy
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics KQL
- Azure route tables and user-defined routes

## Sources Consulted
- Microsoft Learn: Azure Firewall DNAT overview and monitoring - https://learn.microsoft.com/en-us/azure/firewall/destination-nat-rules
- Microsoft Learn: Filter inbound Internet traffic with Azure Firewall DNAT - https://learn.microsoft.com/en-us/azure/firewall/tutorial-firewall-dnat
- Microsoft Learn: Azure Firewall rule processing logic - https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn: Azure CLI `az network firewall nat-rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/nat-rule
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group collection` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group collection rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection/rule
- Microsoft Learn: Azure Firewall monitoring data reference - https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall-reference
- Microsoft Learn: AZFWNatRule table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azfwnatrule
- Microsoft Learn: Diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings

## Issues Found
- The Azure Firewall Policy NAT collection example used `--priority`; the current Azure CLI command requires `--collection-priority` for `az network firewall policy rule-collection-group collection add-nat-collection`. Updated the flag.
- The post stated that DNAT return traffic must be forced back through the firewall. Microsoft documentation says Azure Firewall is stateful and handles return packets for established sessions automatically. Updated the routing section to describe the default route as backend outbound routing, not required DNAT return routing.
- The post claimed the backend sees the original client source IP by default. This is not consistently supported by current Azure Firewall DNAT behavior and was not present in the official DNAT documentation, so the claim was removed.
- The monitoring example enabled legacy network and DNS log categories, then queried a non-existent `AzureFirewallNetworkRule` table for DNAT fields. Updated it to enable the resource-specific `AZFWNatRule` category, use a workspace resource ID, set `--export-to-resource-specific true`, and query the `AZFWNatRule` table with the documented column names.
- The common issues and summary sections repeated the incorrect return-routing framing. Updated them to focus on DNAT rule matching, NSGs, backend listeners, and outbound routing policy.

## Review Notes
The local environment did not have Azure CLI installed, so CLI validation was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help` output. Several Azure Firewall policy rule-collection commands are still marked Preview in the Azure CLI reference.
