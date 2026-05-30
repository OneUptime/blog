# Validation Summary: How to Set Up Azure DDoS Protection with Rapid Response Support

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure DDoS Protection
- Azure DDoS Network Protection
- DDoS Rapid Response (DRR)
- Azure CLI
- Azure Monitor metrics and alerts
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Microsoft Learn: Azure DDoS Protection tier comparison - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-sku-comparison
- Microsoft Learn: Quickstart: Create and configure Azure DDoS Network Protection using Azure CLI - https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-protection-cli
- Microsoft Learn: Azure DDoS Rapid Response - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-rapid-response
- Microsoft Learn: Azure DDoS Protection features - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-features
- Microsoft Learn: Monitor Azure DDoS Protection - https://learn.microsoft.com/en-us/azure/ddos-protection/monitor-ddos-protection
- Microsoft Learn: Supported metrics for Microsoft.Network/publicIPAddresses - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Microsoft Learn: Tutorial: View Azure DDoS Protection logs in Log Analytics workspace - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Microsoft Learn: Azure DDoS Protection FAQ - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-faq
- Microsoft Learn: Azure CLI az monitor metrics alert create - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI az monitor action-group create - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Microsoft Learn: Azure CLI az monitor diagnostic-settings create - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The post used the older "DDoS Protection Standard" terminology. Updated it to "DDoS Network Protection," which is the current Azure documentation terminology.
- The post described Azure as offering two tiers including "Basic." Updated the wording to distinguish the default infrastructure protection from the paid DDoS IP Protection and DDoS Network Protection tiers.
- The DRR prerequisite section incorrectly implied a separate Premier, Unified, or specific support plan requirement. Updated it to match Microsoft documentation: DRR access is a DDoS Network Protection feature, and the selected DDoS plan must be linked to the protected virtual network.
- The DRR support request flow used "Active attack" as the problem type and omitted selecting the DDoS plan resource. Updated the steps to use the documented "Under attack" problem type and DDoS plan selection.
- The post claimed a typical 15-minute DRR response window. Replaced it with the documented statement that DRR follows the Azure Rapid Response support model.
- The post said DRR can help with custom mitigations. Replaced that with the documented scope of attack investigation and post-attack analysis.
- The alert examples used `avg IfUnderDDoSAttack` and `InboundPacketsDroppedDDoS`. Updated the first condition to use the documented recommended `max` aggregation and corrected the dropped-packets metric name to `PacketsDroppedDDoS`.
- The monitoring section used incorrect metric names `InboundPacketsDroppedDDoS` and `InboundPacketsForwardedDDoS`. Updated them to `PacketsDroppedDDoS` and `PacketsForwardedDDoS`.
- The policy tuning section implied customers can manually raise or lower DDoS policy thresholds. Updated it to say thresholds can be reviewed, but Azure does not currently support manual DDoS policy customization.
- The cost protection section referred to broad resource costs and a 30-day claim deadline without official support in the checked docs. Updated it to documented data-transfer and application scale-out service credits for documented DDoS attacks.
- The protected-resource description said "any other resource with a public endpoint." Updated it to supported ARM-based public IP resources in a protected virtual network.
- Replaced "Azure AD tenant" with "Microsoft Entra tenant" and removed an unsupported two-week baselining recommendation.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current official Azure CLI documentation rather than local `az --help` output.
