# Validation Summary: How to Configure Azure VPN Gateway with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure as Code walkthrough)

## Technologies Covered
- OpenTofu / Terraform (HCL)
- azurerm Terraform provider (Virtual Network Gateway, Local Network Gateway, VPN Gateway Connection, Public IP, Subnet, Monitor Metric Alert)
- Azure VPN Gateway (site-to-site IPsec/IKE)
- BGP (Border Gateway Protocol)
- IPsec / IKE (DHGroup14, AES256, SHA256, PFS14)
- Azure Monitor metric alerts

## Sources Consulted
- azurerm `azurerm_virtual_network_gateway` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- azurerm `azurerm_virtual_network_gateway_connection` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- azurerm `azurerm_public_ip` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- azurerm `azurerm_subnet` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- azurerm `azurerm_monitor_metric_alert` resource docs
- Raw provider docs on GitHub: https://github.com/hashicorp/terraform-provider-azurerm/tree/main/website/docs/r
- Azure Monitor supported metrics for `Microsoft.Network/virtualNetworkGateways`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-virtualnetworkgateways-metrics
- Microsoft Azure VPN Gateway docs (GatewaySubnet requirements, SKUs, BGP defaults)

## Issues Found

1. **Deprecated `enable_bgp` attribute on `azurerm_virtual_network_gateway`** — The current azurerm provider uses `bgp_enabled` (renamed from `enable_bgp`). Changed `enable_bgp = true` to `bgp_enabled = true` in the Virtual Network Gateway resource.

2. **Deprecated `enable_bgp` attribute on `azurerm_virtual_network_gateway_connection`** — Same rename applies to the connection resource. Changed `enable_bgp = true` to `bgp_enabled = true` in the VPN Connection resource.

3. **Invalid `sa_datasize = 0` in `ipsec_policy`** — The provider validates that `sa_datasize` must be at least `1024` KB; `0` fails validation. Changed to `102400000` (the documented default).

4. **Non-existent `bgp_settings[0].peering_address` in output** — The current `bgp_settings` block exports `peering_addresses` (plural, a nested list), not the singular `peering_address`. Changed the output value to `azurerm_virtual_network_gateway.vpn.bgp_settings[0].peering_addresses[0].default_addresses[0]`.

## Review Notes
- `GatewaySubnet` naming requirement and the `/27` minimum prefix are correct per Microsoft docs.
- Standard SKU Public IP with `zones = ["1", "2", "3"]` is the correct modern syntax for zone-redundant allocation.
- Azure's default BGP ASN of `65515` is accurate.
- `TunnelAverageBandwidth` is a valid metric under `Microsoft.Network/virtualNetworkGateways`; using `< 1 Kbps` as a disconnect proxy is reasonable, though `TunnelConnectionStatus` (0/1) is a more direct signal for true disconnect alerts.
- VPN SKU list (`VpnGw1`, `VpnGw2`, `VpnGw3`, `VpnGw1AZ`) is a valid subset; additional current SKUs include `VpnGw2AZ`, `VpnGw3AZ`, `VpnGw4`, `VpnGw4AZ`, `VpnGw5`, `VpnGw5AZ` — not an error, just not exhaustive.
- The `active-active` dynamic `ip_configuration` block pattern is valid HCL.
- `sa_lifetime = 27000` (seconds) matches the documented default and is within the valid range.
