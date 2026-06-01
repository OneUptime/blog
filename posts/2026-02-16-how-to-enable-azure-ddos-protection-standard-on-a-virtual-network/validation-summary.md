# Validation Summary: How to Enable Azure DDoS Protection Standard on a Virtual Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DDoS Network Protection
- Azure DDoS Protection plans
- Azure Virtual Network
- Azure public IP resources
- Azure CLI
- Azure Monitor metric alerts
- Azure Monitor diagnostic settings
- Log Analytics
- Application Gateway WAF

## Sources Consulted
- Microsoft Learn: QuickStart: Create and configure Azure DDoS Network Protection using Azure CLI - https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-protection-cli
- Microsoft Learn: Azure CLI az network ddos-protection reference - https://learn.microsoft.com/en-us/cli/azure/network/ddos-protection
- Microsoft Learn: Azure CLI az network vnet reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Microsoft Learn: Azure CLI az monitor metrics alert reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI az monitor diagnostic-settings reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure DDoS Protection frequently asked questions - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-faq
- Microsoft Learn: Compare pricing between Azure DDoS Protection tiers - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-pricing-guide
- Microsoft Azure pricing: Azure DDoS Protection pricing - https://azure.microsoft.com/en-us/pricing/details/ddos-protection/
- Microsoft Learn: Azure DDoS Protection features - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-features
- Microsoft Learn: Supported metrics for Microsoft.Network/publicIPAddresses - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Microsoft Learn: View Azure DDoS Protection logs in Log Analytics workspace - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Microsoft Learn: Azure DDoS Rapid Response - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-rapid-response
- Microsoft Azure Infrastructure Blog: Defending the cloud: Azure neutralized a record-breaking 15 Tbps DDoS attack - https://techcommunity.microsoft.com/blog/azureinfrastructureblog/defending-the-cloud-azure-neutralized-a-record-breaking-15-tbps-ddos-attack/4470422

## Issues Found
- The post said Azure had mitigated attacks exceeding 3.47 Tbps. Microsoft has since reported a 15.72 Tbps Azure DDoS mitigation event, so the claim was updated to "exceeding 15 Tbps."
- The post said one DDoS Protection plan can protect up to 200 virtual networks. Current Microsoft guidance describes a single plan as usable across subscriptions in the same tenant and pricing examples state it can be linked to any number of VNets; the unsupported numeric limit was removed.
- The post said DDoS Protection Standard has fixed monthly cost plus per-GB data processing charges. Current pricing is a fixed Network Protection monthly charge including 100 public IP resources, with per-resource monthly overage for additional protected public IP resources; the pricing text was corrected.
- The post said all public IPs and any resource with a public endpoint in the VNet are protected. Microsoft documents protection for supported public IP resource types and separately notes unsupported multi-tenant single-VIP PaaS services; the wording was narrowed to supported public IP resources and examples were aligned with Microsoft documentation.
- The post said users can pre-engage DRR by creating a DDoS Rapid Response profile. Current DRR documentation describes engaging DRR through support and allows engagement for planned viral events; the unsupported "profile" reference was replaced.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help`. The CLI commands and flags in the post match current documented Azure CLI usage.
