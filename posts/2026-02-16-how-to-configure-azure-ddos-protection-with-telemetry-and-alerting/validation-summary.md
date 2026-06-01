# Validation Summary: How to Configure Azure DDoS Protection with Telemetry and Alerting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DDoS Protection
- Azure DDoS Network Protection
- Azure DDoS IP Protection
- Azure Monitor metrics and alerts
- Azure Monitor diagnostic settings
- Log Analytics / KQL
- Azure CLI
- Event Hubs SIEM export

## Sources Consulted
- Microsoft Learn: QuickStart: Create and configure Azure DDoS Network Protection using Azure CLI - https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-protection-cli
- Microsoft Learn: Azure DDoS Protection features - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-features
- Microsoft Learn: About Azure DDoS Protection Tier Comparison - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-sku-comparison
- Microsoft Learn: Azure DDoS Protection frequently asked questions - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-faq
- Microsoft Learn: View Azure DDoS Protection logs in Log Analytics workspace - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Microsoft Learn: Supported metrics for Microsoft.Network/publicIPAddresses - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Microsoft Learn: az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: az monitor metrics - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Azure: Azure DDoS Protection pricing - https://azure.microsoft.com/en-us/pricing/details/ddos-protection/

## Issues Found
- The post described Azure DDoS Protection as having a free Basic tier and a Network Protection tier. Updated this to distinguish no-cost infrastructure-level protection from the paid DDoS IP Protection and DDoS Network Protection tiers.
- The tier comparison table omitted DDoS IP Protection and incorrectly mapped some paid-tier capabilities. Updated the table to include infrastructure protection, IP Protection, and Network Protection.
- The post incorrectly stated that only Standard SKU public IPs receive DDoS Network Protection. Updated this to clarify that Network Protection supports Standard and Basic public IP tiers, while DDoS IP Protection supports only Standard SKU public IPs.
- The DDoS metric name `DDoSDroppedPackets` was incorrect. Replaced it with the documented `PacketsDroppedDDoS` metric and changed aggregation from `Total` to `Maximum`, matching the metric definition.
- The Azure Monitor alert commands used the unsupported `--action-group` option. Replaced it with the documented `--action` option.
- The Event Hub diagnostic setting example used `--event-hub-name`, which is not the documented Azure CLI option. Replaced it with `--event-hub`.
- The KQL dashboard examples projected undocumented or incorrect DDoS log fields such as `droppedPackets_s`, `forwardedPackets_s`, and `maxPacketsPerSecond_d`. Updated them to use fields from Microsoft's published DDoS diagnostic log schema.
- The adaptive tuning section asserted a specific 7-14 day learning period that was not supported by current Microsoft documentation. Replaced it with the documented behavior that Azure profiles traffic over time and updates the mitigation profile as traffic changes.
- The cost section included a hardcoded monthly price. Replaced it with a price-stable description of fixed monthly Network Protection pricing, the included 100 public IP resources, and per-resource charges above that allowance.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn Azure CLI references rather than local `az --help` output.
