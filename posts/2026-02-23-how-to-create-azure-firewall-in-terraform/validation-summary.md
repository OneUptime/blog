# Validation Summary: How to Create Azure Firewall in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Firewall
- Azure Firewall Policy and rule collection groups
- Azure Virtual Network peering and routing
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- HashiCorp AzureRM Provider `azurerm_firewall` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/firewall.html.markdown
- HashiCorp AzureRM Provider `azurerm_firewall_policy` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/firewall_policy.html.markdown
- HashiCorp AzureRM Provider `azurerm_firewall_policy_rule_collection_group` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/firewall_policy_rule_collection_group.html.markdown
- HashiCorp AzureRM Provider `azurerm_monitor_diagnostic_setting` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/monitor_diagnostic_setting.html.markdown
- HashiCorp AzureRM Provider `azurerm_virtual_network_peering` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network_peering.html.markdown
- HashiCorp Help Center: Required `subscription_id` in AzureRM Provider 4.0: https://support.hashicorp.com/hc/en-us/articles/40621007246099-Required-subscription-id-Error-in-Terraform-with-AzureRM
- Microsoft Learn: Azure Firewall features by SKU: https://learn.microsoft.com/en-us/azure/firewall/features-by-sku
- Microsoft Learn: Azure Firewall rule processing logic: https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn: Azure Firewall DNS settings: https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Microsoft Learn: Azure Firewall monitoring: https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Microsoft Learn: Supported logs for `Microsoft.Network/azureFirewalls`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-azurefirewalls-logs
- Microsoft Learn: Configure VPN gateway transit for virtual network peering: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-peering-gateway-transit

## Issues Found
- The provider example pinned AzureRM to `~> 3.80`, which is outdated for a 2026 tutorial. Updated it to `~> 4.0` and added `subscription_id = var.subscription_id`, because AzureRM v4 requires an explicit subscription ID for plan/apply operations.
- The prerequisites only mentioned Azure CLI authentication. Updated them to also require an Azure subscription ID, matching the AzureRM v4 provider configuration.
- The opening Azure Firewall description implied TLS inspection and URL filtering were general Azure Firewall capabilities. Clarified that they depend on SKU, because they are Premium capabilities.
- The Standard and Premium SKU summaries did not clearly distinguish Standard web categories from Premium advanced web categories. Updated Standard to mention DNS proxy, web categories, and scaling up to 30 Gbps, and updated Premium to say advanced web categories.
- The hub-to-spoke peering sample set `allow_gateway_transit = true` without creating a VPN gateway or route server. Changed it to `false` so the sample matches the topology being deployed.
- The diagnostic setting used legacy Azure Firewall categories for application, network, and DNS logs while also using `AZFWThreatIntel`, a structured category. Updated the sample to use resource-specific categories consistently: `AZFWApplicationRule`, `AZFWNetworkRule`, `AZFWNatRule`, `AZFWDnsQuery`, and `AZFWThreatIntel`, and set `log_analytics_destination_type = "Dedicated"`.
- The diagnostic setting used the older `metric` block. Updated it to the current `enabled_metric` block used by the AzureRM provider documentation.

## Review Notes
- Terraform is not installed in this workspace, so I could not run `terraform init` or `terraform validate` on the extracted snippets. The HCL was reviewed manually against the current AzureRM provider documentation.
- The management subnet shown in the sample is only needed when configuring Azure Firewall forced tunneling with a `management_ip_configuration`; the current post creates the subnet but does not configure forced tunneling.
