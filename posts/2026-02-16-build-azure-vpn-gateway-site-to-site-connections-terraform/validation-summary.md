# Validation Summary: How to Build Azure VPN Gateway Site-to-Site Connections with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway
- Azure Virtual Network and GatewaySubnet
- Azure Local Network Gateway
- Azure Monitor diagnostics and metric alerts
- Terraform
- HashiCorp AzureRM provider
- IPsec/IKE site-to-site VPN
- BGP routing

## Sources Consulted
- Azure VPN Gateway SKU documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus
- Azure VPN Gateway BGP configuration documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/bgp-howto
- Azure VPN Gateway custom traffic selector documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/custom-traffic-selectors
- Azure VPN Gateway IPsec/IKE policy documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto
- Azure VPN Gateway diagnostics troubleshooting documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/troubleshoot-vpn-with-azure-diagnostics
- Azure VPN Gateway monitoring data reference: https://learn.microsoft.com/en-us/azure/vpn-gateway/monitor-vpn-gateway-reference
- Azure VPN Gateway public IP documentation: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-vpn-gateway
- HashiCorp AzureRM provider documentation for `azurerm_virtual_network_gateway`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- HashiCorp AzureRM provider documentation for `azurerm_virtual_network_gateway_connection`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- HashiCorp AzureRM provider documentation for `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting

## Issues Found
- The VPN gateway snippet claimed VpnGw2 provides 1.25 Gbps throughput without specifying Generation2. I added `generation = "Generation2"` and clarified the SKU reference list with generation labels because Azure publishes different throughput values by gateway generation.
- The gateway BGP settings configured a custom APIPA peering address while the local network gateway used a regular non-APIPA BGP peer address. I removed the APIPA override to avoid implying it would be used in that configuration.
- The connection configured `traffic_selector_policy` without enabling policy-based traffic selectors. I added `use_policy_based_traffic_selectors = true`, which Azure requires for custom traffic selectors to take effect.
- The monitoring and alerting snippets referenced `var.log_analytics_workspace_id` and `var.alert_action_group_id` without declaring them. I added both variable definitions.
- The metric alert was described as a tunnel disconnection alert, but `TunnelEgressBytes` is a byte counter and low traffic does not necessarily mean a tunnel is disconnected. I changed the resource name, comment, description, and threshold comment to describe it as a low egress traffic alert.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was performed against Azure documentation and the Terraform AzureRM provider documentation. The post pins AzureRM `~> 3.80`; the examples use syntax valid for that provider generation, while newer AzureRM 4.x documentation has renamed some fields such as the virtual network gateway BGP flag.
