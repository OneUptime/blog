# Validation Summary: How to Set Up Azure DDoS Protection Diagnostic Logs and Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure DDoS Protection
- Azure Monitor diagnostic settings
- Azure Monitor metrics and metric alerts
- Azure Log Analytics / KQL
- Microsoft Sentinel
- Azure CLI
- Network Security Groups

## Sources Consulted
- Microsoft Learn: Tutorial: View Azure DDoS Protection logs in Log Analytics workspace - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Microsoft Learn: Azure DDoS Protection overview - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview
- Microsoft Learn: Azure DDoS Protection tier comparison - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-sku-comparison
- Microsoft Learn: Monitor Azure DDoS Protection - https://learn.microsoft.com/en-us/azure/ddos-protection/monitor-ddos-protection
- Microsoft Learn: Azure DDoS Protection monitoring data reference - https://learn.microsoft.com/en-us/azure/ddos-protection/monitor-ddos-protection-reference
- Microsoft Learn: Microsoft Sentinel data connectors reference, Azure DDoS Protection - https://learn.microsoft.com/en-us/azure/sentinel/data-connectors-reference#azure-ddos-protection
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings create` - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure CLI `az monitor action-group create` - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Microsoft Learn: Azure CLI `az monitor metrics alert create` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI `az network public-ip` DDoS protection settings - https://learn.microsoft.com/en-us/cli/azure/network/public-ip

## Issues Found
- Updated the DDoS Protection prerequisites and introduction to avoid the outdated "Standard" terminology and to include both DDoS Network Protection and DDoS IP Protection.
- Fixed public IP discovery commands so they include both explicitly enabled DDoS IP Protection and `VirtualNetworkInherited` DDoS Network Protection public IPs.
- Corrected the Sentinel solution contents list to match the documented connector/workbook scope instead of claiming bundled analytics rules and hunting queries.
- Corrected the ingestion verification guidance. DDoS notification logs are generated for attack start and mitigation end events, not periodic "no attack" status messages.
- Replaced incorrect KQL references to `msg_s` with the documented `Message` field.
- Removed the `action_s` assumptions from the flow-log workbook query because the current DDoS mitigation flow-log schema documents source/destination/protocol fields, not an `action_s` column.
- Changed the automated response guidance from automatic NSG blocking to incident enrichment, with a caveat to block only after validating non-spoofed traffic and NSG rule constraints.
- Updated the Azure CLI action group example to use the current `--action email NAME EMAIL_ADDRESS` syntax.
- Replaced the cost-control recommendation about data collection rules filtering DDoS flow logs before ingestion because current DDoS resource logs do not support ingestion-time transformation.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
