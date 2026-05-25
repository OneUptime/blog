# Validation Summary: How to Create Azure Virtual WAN in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual WAN
- Azure Virtual Hubs
- Azure VPN Gateway and VPN Sites
- Azure Virtual WAN hub routing
- Azure Monitor diagnostic settings
- Azure Log Analytics

## Sources Consulted
- HashiCorp Terraform Registry: AzureRM `azurerm_virtual_wan` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_wan
- HashiCorp Terraform Registry: AzureRM `azurerm_virtual_hub` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_hub
- HashiCorp Terraform Registry: AzureRM `azurerm_virtual_hub_connection` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_hub_connection
- HashiCorp Terraform Registry: AzureRM `azurerm_vpn_gateway` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/vpn_gateway
- HashiCorp Terraform Registry: AzureRM `azurerm_vpn_site` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/vpn_site
- HashiCorp Terraform Registry: AzureRM `azurerm_vpn_gateway_connection` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/vpn_gateway_connection
- HashiCorp Terraform Registry: AzureRM `azurerm_virtual_hub_route_table` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_hub_route_table
- HashiCorp Terraform Registry: AzureRM `azurerm_monitor_diagnostic_setting` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Microsoft Learn: Azure Virtual WAN overview, https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-about
- Microsoft Learn: About virtual hub settings, https://learn.microsoft.com/en-us/azure/virtual-wan/hub-settings
- Microsoft Learn: Securing internet access with routing intent, https://learn.microsoft.com/en-us/azure/virtual-wan/about-internet-routing
- Microsoft Learn: Basic static route scenarios with Azure Firewall in Virtual WAN, https://learn.microsoft.com/en-us/azure/virtual-wan/static-routes-firewall-basic

## Issues Found
- The `azurerm_vpn_gateway_connection` IPsec policy used `sa_data_size_in_kilobytes` and `sa_lifetime_in_seconds`, which are valid for `azurerm_virtual_network_gateway_connection` but not for Virtual WAN VPN gateway connections. Updated them to `sa_data_size_kb` and `sa_lifetime_sec`.
- The `disable_vpn_encryption` comment said to keep the setting true in production, but `true` disables VPN encryption. Updated the comment to say keep it false in production.
- The `internet_security_enabled` comment implied that the setting alone routes internet traffic through the hub. Updated it to clarify that it propagates a default route for secured internet traffic when the hub is configured for that routing.

## Review Notes
- The post pins `azurerm` to `~> 3.80`, which is older than the current AzureRM 4.x major line but remains a version-specific constraint. Future updates to AzureRM 4.x should account for the provider's explicit subscription ID requirement when using Azure CLI authentication.
