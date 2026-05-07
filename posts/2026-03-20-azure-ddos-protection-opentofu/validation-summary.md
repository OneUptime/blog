# Validation Summary: How to Set Up Azure DDoS Protection with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure DDoS Network Protection
- Azure Monitor
- Azure CLI
- AzureRM provider (Terraform/OpenTofu HCL)

## Sources Consulted
- Azure DDoS Protection Overview: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview
- Types of attacks Azure DDoS Protection mitigates: https://learn.microsoft.com/en-us/azure/ddos-protection/types-of-attacks
- About Azure DDoS Protection Tier Comparison: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-sku-comparison
- Compare pricing between Azure DDoS Protection tiers: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-pricing-guide
- Tutorial: View Azure DDoS Protection logs in Log Analytics workspace: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-view-diagnostic-logs
- Supported metrics for Microsoft.Network/publicIPAddresses: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Supported logs for Microsoft.Network/publicIPAddresses: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-publicipaddresses-logs
- QuickStart: Create and configure Azure DDoS IP Protection using Azure CLI: https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-ip-protection-cli
- Azure CLI `az monitor metrics` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest
- Terraform Registry `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Terraform Registry `azurerm_public_ip`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Terraform Registry `azurerm_virtual_network`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- Terraform Registry `azurerm_monitor_metric_alert`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert

## Issues Found
- The post claimed Azure DDoS Network Protection mitigates application-layer attacks directly. I corrected this to Layer 3/4 coverage and added the required WAF note for Layer 7 protection because Microsoft documents application-layer defense separately.
- The public IP coverage/SKU wording implied Network Protection requires Standard SKU public IPs. I corrected the wording to reflect current guidance: use Standard SKU for new public IPs, DDoS IP Protection requires Standard SKU, and Network Protection protects public IP resources associated with linked VNets.
- The packet-drop alert used `DDoSTriggerTCPPackets`, which is the metric for inbound TCP packets that trigger mitigation, not dropped packets. I changed it to `PacketsDroppedDDoS`, which matches the alert name and description.
- The diagnostic setting example used `metric {}` instead of the current `enabled_metric {}` block used by the AzureRM provider. I updated the snippet to the current resource syntax.
- The Azure CLI metrics example used `--metric`; I updated it to `--metrics` to match the current command syntax shown in the CLI reference.
- The conclusion used imprecise pricing and logging wording. I updated it to the current shared pricing model and clarified that diagnostic logs, mitigation flow logs, and mitigation reports are the relevant telemetry outputs.

## Review Notes
- The Terraform/OpenTofu snippets are partial examples, so they were validated for syntax and documented behavior rather than executed end-to-end in this workspace.
- `az` and `tofu` were not installed in this environment, so command validation was documentation-based rather than runtime-tested.
