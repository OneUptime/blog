# Validation Summary: How to Configure Azure Firewall Application Rules for FQDN-Based Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall application rules
- FQDN filtering and FQDN tags
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics / Kusto Query Language

## Sources Consulted
- Azure Firewall rule processing logic: https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Azure Firewall FQDN filtering in network rules: https://learn.microsoft.com/en-us/azure/firewall/fqdn-filtering-network-rules
- Azure Firewall FQDN tags overview: https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Azure Firewall DNS settings: https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Azure Firewall SQL FQDN filtering: https://learn.microsoft.com/en-us/azure/firewall/sql-fqdn-filtering
- Azure Firewall monitoring and diagnostic logs: https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Azure CLI reference for `az network firewall`: https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Azure CLI reference for `az network firewall policy`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy
- Azure CLI reference for firewall policy rule collection commands: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Azure CLI reference for firewall policy rule commands: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection/rule

## Issues Found
- The deployment created only `AzureFirewallSubnet`, but the routing example later associated a route table with `snet-workload`. Added creation of `snet-workload` with `10.0.2.0/24` so the example is internally consistent.
- The Windows Update FQDN tag example used both `Http=80` and `Https=443`. Microsoft guidance for FQDN tags says to set the protocol:port field to HTTPS, so the example was changed to `Https=443`.
- The SQL FQDN filtering section omitted the documented requirement that SQL FQDN filtering is supported in proxy mode on port 1433. Added a short caveat and the network-rule alternative for default redirect mode.
- The diagnostic settings example referenced a Log Analytics workspace that was not created earlier. Added an `az monitor log-analytics workspace create` command before enabling diagnostics.
- The DNS proxy best-practice command passed `--dns-servers` without values, which would not be valid. Removed the empty argument and clarified that the VNet DNS server should be set to the firewall private IP before enabling DNS proxy on the policy.

## Review Notes
- The Azure CLI executable is not installed in this workspace, so command validation was performed against official Azure CLI reference documentation rather than local `az --help` output.
- Several Azure Firewall policy rule collection commands are documented as extension commands and some remain marked preview in the Azure CLI reference, but the commands and parameters used in the post match current documented syntax.
- The logging example uses legacy `AzureDiagnostics` queries, which remain documented. Future updates could show resource-specific structured log tables as the recommended logging mode.
