# Validation Summary: How to Configure Azure Firewall DNS Proxy and FQDN-Based Filtering Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall DNS proxy
- FQDN filtering
- Azure CLI
- Azure Monitor / Log Analytics
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Azure Firewall DNS settings - https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Microsoft Learn: Azure Firewall DNS Proxy details - https://learn.microsoft.com/en-us/azure/firewall/dns-details
- Microsoft Learn: Azure Firewall FQDN filtering in network rules - https://learn.microsoft.com/en-us/azure/firewall/fqdn-filtering-network-rules
- Microsoft Learn: Azure Firewall rule processing logic - https://learn.microsoft.com/en-us/azure/firewall/infrastructure-fqdns
- Microsoft Learn: FQDN tags overview for Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Microsoft Learn: Azure Firewall features by SKU - https://learn.microsoft.com/en-us/azure/firewall/features
- Microsoft Learn: Azure Firewall performance - https://learn.microsoft.com/en-gb/azure/firewall/firewall-performance
- Microsoft Learn: Azure CLI reference for firewall policy rule collection group collections - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure Firewall structured logs - https://learn.microsoft.com/en-us/azure/firewall/firewall-structured-logs
- Microsoft Learn: AzureDiagnostics sample queries for Azure Firewall DNS proxy logs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/azurediagnostics
- Microsoft Learn: AZFWDnsQuery table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azfwdnsquery

## Issues Found
- Clarified that DNS proxy is required specifically for FQDNs in network rules, while application-rule FQDN filtering works through the application proxy and SNI/Host handling.
- Replaced wording that said Azure Firewall "inspects" DNS queries with "process and forward" to match the documented DNS proxy behavior.
- Clarified the DNS mismatch explanation for network rules so it describes inconsistent DNS resolution rather than implying the firewall never has any domain context.
- Updated the HTTPS application rule description from "SNI inspection" to "use the SNI header" to avoid implying TLS decryption.
- Clarified that wildcard FQDNs apply to application rule target FQDNs and added that network rule FQDNs do not support wildcards.
- Added the missing `NetworkRules` rule collection group creation command before adding the network rule collection.
- Corrected the network rule CLI example from `--protocols TCP` to `--ip-protocols TCP`, which is the Azure CLI parameter for network rules.
- Clarified the CLI distinction between application rule parameters (`--target-fqdns`, `--protocols`) and network rule parameters (`--destination-fqdns`, `--ip-protocols`).
- Updated the FQDN tag example to use `--protocols Https=443`, matching Microsoft guidance for FQDN tags in application rules.
- Removed an unsupported fixed DNS latency estimate and replaced the DNS cache-size note with documented TTL behavior.
- Replaced the claim that Premium has higher DNS query throughput with documented overall throughput and feature-cost guidance.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn Azure CLI reference pages instead of local `az --help` output. The KQL example using `AzureDiagnostics` is valid for legacy Azure Diagnostics mode; deployments using resource-specific tables should query `AZFWDnsQuery` instead.
