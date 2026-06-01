# Validation Summary: How to Configure AKS with Azure Firewall for Egress Traffic Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Firewall and Azure Firewall Policy
- Azure Virtual Network hub-spoke networking
- User-defined routes (UDRs)
- Azure CLI
- Azure Monitor / Log Analytics
- Kubernetes egress testing

## Sources Consulted
- Microsoft Learn: Limit network traffic with Azure Firewall in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-gb/azure/aks/limit-egress-traffic
- Microsoft Learn: Outbound network and FQDN rules for Azure Kubernetes Service (AKS) clusters: https://learn.microsoft.com/en-us/azure/aks/outbound-rules-control-egress
- Microsoft Learn: FQDN tags overview for Azure Firewall: https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Microsoft Learn Azure CLI reference: az network firewall policy rule-collection-group collection: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn Azure CLI reference: az network firewall: https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Azure Firewall DNS settings: https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Microsoft Learn: Azure Monitor Logs reference - AZFWApplicationRule: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azfwapplicationrule
- Microsoft Learn: Queries for the AZFWApplicationRule table: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/azfwapplicationrule

## Issues Found
- The post said the `AzureKubernetesService` FQDN tag includes all required Microsoft endpoints. This was too broad because AKS also requires non-HTTP/S network rules. Changed the text to say the tag covers the required AKS FQDN endpoints handled by application rules, and that separate network rules are still required.
- The network rule example was labeled as NTP and DNS, but it allowed UDP ports 123 and 1194 only. Changed the label and explanation to identify it as NTP and AKS tunnel traffic.
- The required AKS network rules were missing TCP port 9000 for tunneled node-to-control-plane communication. Added a separate TCP network rule for port 9000.
- Azure CLI firewall policy filter collection examples did not specify `--rule-name`. Added explicit rule names to the filter collection commands to match Azure CLI reference examples and avoid ambiguity across CLI extension versions.
- The Log Analytics query used `AzureFirewallApplicationRule` as a table name. For the legacy diagnostic categories enabled in the example, Azure Firewall logs are queried from `AzureDiagnostics` with `Category == "AzureFirewallApplicationRule"`. Updated the query accordingly.

## Review Notes
- The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
- Current AKS documentation notes that NTP port 123 is not required for Linux nodes provisioned after March 2021, but it is still listed in the Azure Firewall egress examples and remains harmless for broader compatibility.
- Azure Firewall structured logs now commonly use resource-specific tables such as `AZFWApplicationRule` and `AZFWNetworkRule`; resource-specific logging would be a good future update if the post is expanded.
