# Validation Summary: How to Configure Azure DDoS Protection Standard for Internet-Facing Workloads

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure DDoS Protection
- Azure DDoS Network Protection
- Azure Monitor metric alerts
- Azure Monitor diagnostic settings
- Log Analytics / KQL
- Azure Web Application Firewall
- Azure Application Gateway
- Azure Front Door
- Azure CLI

## Sources Consulted
- Microsoft Learn: QuickStart: Create and configure Azure DDoS Network Protection using Azure CLI - https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-protection-cli
- Microsoft Learn: Azure DDoS Protection overview - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview
- Microsoft Learn: Azure DDoS Protection features - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-features
- Microsoft Learn: Azure DDoS Protection tier comparison - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-sku-comparison
- Microsoft Learn: View Azure DDoS Protection logs in Log Analytics workspace - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Microsoft Learn: Supported metrics for Microsoft.Network/publicIPAddresses - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Microsoft Learn: Azure CLI az monitor metrics alert reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Azure: Azure DDoS Protection pricing - https://azure.microsoft.com/en-us/pricing/details/ddos-protection/
- Microsoft Learn: DDoS Protection on Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-ddos

## Issues Found
- Updated outdated tier terminology from "DDoS Protection Standard" and "Basic" to the current Azure DDoS Network Protection, IP Protection, and infrastructure protection terminology.
- Corrected the Layer 7 coverage claim. Azure DDoS Protection protects at network layers 3 and 4; application-layer protection requires WAF or another application-layer control.
- Corrected the VNet protection wording to say supported public IP resources are protected, and noted that VPN gateways are protected by policy but do not support adaptive tuning.
- Replaced the mitigation flow log KQL fields with fields from the documented DDoS flow log schema, including `SourcePublicIpAddress`, `DestPublicIpAddress`, `DestPort`, and `Protocol`.
- Changed the PacketCount alert aggregation from `max` to `total`, matching the documented aggregation for the `PacketCount` metric.
- Removed the unsupported claim that adaptive profiling takes about 30 days and that operators should temporarily adjust DDoS policy thresholds. The post now states that protection starts immediately and auto-tuned profiles adjust over time.
- Updated pricing language to match current Azure pricing documentation: Network Protection has a fixed monthly plan charge that includes 100 public IP resources, with overage charges beyond that amount; pricing should be verified in the Azure pricing calculator.
- Adjusted the Application Gateway WAF verification query to include SKU tier and attached firewall policy information, not only the legacy inline WAF configuration flag.

## Review Notes
Azure CLI could not be checked locally because `az` is not installed in this workspace, so CLI syntax was validated against Microsoft Learn command references and examples.
