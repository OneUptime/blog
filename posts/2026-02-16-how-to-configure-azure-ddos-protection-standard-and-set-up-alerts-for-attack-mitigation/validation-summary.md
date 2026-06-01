# Validation Summary: How to Configure Azure DDoS Protection Standard and Set Up Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DDoS Protection
- Azure DDoS Network Protection
- Azure Virtual Network
- Azure Public IP Address
- Azure Monitor metrics and metric alerts
- Azure Monitor diagnostic settings
- Azure PowerShell
- Azure CLI
- Log Analytics and Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: What is Azure DDoS Protection? https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview
- Microsoft Learn: Azure DDoS Protection tier comparison https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-sku-comparison
- Microsoft Learn: Compare pricing between Azure DDoS Protection tiers https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-pricing-guide
- Microsoft Learn: Azure DDoS Protection FAQ https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-faq
- Microsoft Learn: Azure DDoS Protection features https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-features
- Microsoft Learn: Supported metrics for Microsoft.Network/publicIPAddresses https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Microsoft Learn: Supported logs for Microsoft.Network/publicIPAddresses https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-publicipaddresses-logs
- Microsoft Learn: View Azure DDoS Protection logs in Log Analytics workspace https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Microsoft Learn: az network ddos-protection https://learn.microsoft.com/en-us/cli/azure/network/ddos-protection
- Microsoft Learn: New-AzDdosProtectionPlan https://learn.microsoft.com/en-us/powershell/module/az.network/new-azddosprotectionplan
- Microsoft Learn: New-AzDiagnosticSetting https://learn.microsoft.com/en-us/powershell/module/az.monitor/new-azdiagnosticsetting
- Microsoft Learn: New-AzActionGroup https://learn.microsoft.com/en-us/powershell/module/az.monitor/new-azactiongroup
- Microsoft Learn: Add-AzMetricAlertRuleV2 https://learn.microsoft.com/en-us/powershell/module/az.monitor/add-azmetricalertrulev2

## Issues Found
- Updated outdated "Basic" and "Standard" tier terminology to current Azure terms: infrastructure protection, DDoS Network Protection, and DDoS IP Protection.
- Replaced the fixed pricing statement and "data processing charges" wording with current pricing guidance: Network Protection has a fixed monthly plan charge and includes up to 100 protected public IP resources across the tenant, with additional IPs charged separately.
- Corrected PowerShell VNet association examples to assign a `Microsoft.Azure.Commands.Network.Models.PSResourceId` object before setting the DDoS protection plan ID, matching Microsoft PowerShell examples.
- Narrowed the public IP verification script description because it only verifies VM NIC-attached public IPs, not every protected resource type such as load balancers, application gateways, firewalls, or gateways.
- Updated the diagnostic settings example from the older `Set-AzDiagnosticSetting` parameter style to the current `New-AzDiagnosticSetting` pattern using log and metric settings objects.
- Updated the action group example to use current `New-AzActionGroupEmailReceiverObject` and `New-AzActionGroup` syntax.
- Corrected the high packet alert explanation: `DDoSTriggerTCPPackets` is a mitigation trigger threshold metric, not a packet drop-rate metric.
- Rewrote KQL examples to use documented `AzureDiagnostics` fields for DDoS flow logs and mitigation reports instead of parsing unsupported `properties_s` JSON fields.
- Corrected the conclusion to state that Azure DDoS Protection covers Layer 3 and Layer 4 attacks, and that Layer 7 application attack protection requires a web application firewall.
- Simplified the cost protection section to align with Microsoft guidance for documented DDoS-related data-transfer and application scale-out service credits.

## Review Notes
The Azure CLI command for creating a DDoS protection plan matches official CLI documentation, but the Azure CLI was not installed in the local workspace, so it was verified against Microsoft Learn rather than local `az --help` output.
