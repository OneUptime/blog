# Validation Summary: How to Create Azure DDoS Protection Plan in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure DDoS Protection
- Azure Virtual Network
- Azure Public IP
- Azure Load Balancer
- Azure Monitor diagnostic settings
- Azure Monitor metric alerts
- Azure Log Analytics

## Sources Consulted
- Azure DDoS Protection overview: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview
- Azure DDoS Protection pricing guide: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-pricing-guide
- Azure DDoS Protection FAQ: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-faq
- Azure DDoS Network Protection quickstart: https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-protection
- Azure DDoS Protection features: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-features
- Supported metrics for Microsoft.Network/publicIPAddresses: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Supported log categories for Microsoft.Network/publicIPAddresses: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-publicipaddresses-logs
- Terraform azurerm_network_ddos_protection_plan resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_ddos_protection_plan
- Terraform azurerm_virtual_network resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- Terraform azurerm_monitor_metric_alert resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert
- Terraform azurerm_monitor_diagnostic_setting resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting

## Issues Found
- The post said Azure DDoS Protection automatically mitigates application-layer attacks. Azure DDoS Protection covers layer 3 and layer 4; layer 7 protection requires a WAF. Updated the explanation to say application-layer attacks should be handled with a WAF.
- The tier discussion used older Basic/Standard framing and omitted DDoS IP Protection. Updated the language to current Azure terms: Infrastructure Protection, DDoS Network Protection, and DDoS IP Protection.
- The post said one DDoS Protection plan can protect up to 100 virtual networks. Current Microsoft documentation describes the included allowance as up to 100 protected public IP addresses/resources, while the plan can be linked across VNets, regions, and subscriptions in the same Microsoft Entra tenant. Updated the prerequisite and best-practice text.
- The post described DDoS Network Protection cost as plus data processing charges. Current pricing guidance describes charges for additional protected public IP resources beyond the included allowance. Updated the cost language.
- The `PacketsDroppedDDoS` and `BytesDroppedDDoS` alerts used `Total` aggregation and described count/volume thresholds. Microsoft documents these metrics as per-second metrics with `Maximum` as the default aggregation. Updated the examples to use `Maximum` and describe the thresholds as rates.
- The post referred to a cost protection SLA. Microsoft documentation calls this a cost protection guarantee. Updated the wording.

## Review Notes
The Terraform resource names and block structures used in the examples are valid for the AzureRM provider pattern shown in the post. The post pins `azurerm` to `~> 3.80`; this is not the latest major provider line as of this review, but the referenced resources and arguments are still documented in current provider documentation.
