# Validation Summary: How to Configure VPN Connections on Azure with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- Terraform azurerm provider
- Azure VPN Gateway (Site-to-Site, RouteBased)
- Azure Virtual Network / Subnet (`GatewaySubnet`)
- Azure Public IP (Standard SKU)
- Azure Local Network Gateway
- IPsec VPN connections

## Sources Consulted
- Terraform azurerm provider docs: `azurerm_virtual_network_gateway` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway)
- Terraform azurerm provider docs: `azurerm_virtual_network_gateway_connection` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection)
- Terraform azurerm provider docs: `azurerm_local_network_gateway` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/local_network_gateway)
- Terraform azurerm provider docs: `azurerm_public_ip`, `azurerm_subnet`, `azurerm_virtual_network`
- Microsoft Learn: About VPN Gateway (https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)
- Microsoft Learn: GatewaySubnet naming requirement
- OpenTofu CLI documentation

## Issues Found
No technical issues found.

All `azurerm_*` resource schemas, argument names, and values match the current provider documentation:
- `GatewaySubnet` naming requirement is correct (Azure requires this exact name).
- `azurerm_public_ip` with `allocation_method = "Static"` and `sku = "Standard"` is correct pairing (Standard SKU public IPs require Static allocation, and VPN Gateway typically requires Standard SKU).
- `azurerm_virtual_network_gateway` fields (`type = "Vpn"`, `vpn_type = "RouteBased"`, `sku = "VpnGw1"`, `active_active`, `enable_bgp`) are valid.
- `ip_configuration.private_ip_address_allocation = "Dynamic"` is correct for VPN Gateway.
- `azurerm_local_network_gateway` uses `gateway_address` and `address_space` correctly.
- `azurerm_virtual_network_gateway_connection` with `type = "IPsec"`, `virtual_network_gateway_id`, `local_network_gateway_id`, and `shared_key` correctly models a Site-to-Site IPsec connection.
- 30-45 minute provisioning time is consistent with Microsoft's published expectations.
- `tofu init/plan/apply` commands are correct OpenTofu CLI syntax.

## Review Notes
- Variables like `var.on_prem_public_ip`, `var.on_prem_cidr`, and `var.vpn_shared_key` are referenced without declaration. The post could be improved by including a `variable` block to show their definitions, but this is a completeness/stylistic point, not a technical error.
- `VpnGw1` is a Generation 1 SKU; for newer deployments users may wish to consider `VpnGw2` or higher generation SKUs for better performance, but `VpnGw1` remains a supported, valid SKU.
- `active_active = false` and `enable_bgp = false` are the defaults and could be omitted, but explicit declaration is valid and arguably clearer.
- The `provider "azurerm"` block uses `features {}` which is required by the provider — this is correct.
