# Validation Summary: How to Create Azure VPN Gateways with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure VPN Gateway
- Azure Resource Manager (`azurerm`) provider
- Azure networking
- IPsec/IKE site-to-site VPN

## Sources Consulted
- Azure VPN Gateway configuration settings: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings
- About gateway SKUs: https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus
- About Azure VPN Gateway: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways
- About Azure Point-to-Site VPN connections: https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-about
- `azurerm_virtual_network_gateway` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- `azurerm_virtual_network_gateway_connection` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- `azurerm_local_network_gateway` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/local_network_gateway
- `azurerm_public_ip` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The post description claimed both site-to-site and point-to-site coverage, but the article only implements a site-to-site VPN. I corrected the description to match the actual content.
- The VPN gateway example used `enable_bgp`, but the current AzureRM resource argument is `bgp_enabled`. I corrected the argument name so the example matches the provider documentation.
- The gateway subnet comment said `/27 or larger recommended`. For the non-Basic SKU used in the example (`VpnGw1`), Azure documents `/27 or larger` as required. I corrected the comment.
- The SKU comment listed gateway SKUs only up to `VpnGw3`. Current Azure documentation includes `VpnGw4` and `VpnGw5`, so I updated the comment to `VpnGw1-VpnGw5`.
- The `vpn_shared_key` variable declaration was malformed HCL because it placed two arguments on one line without proper separation. I rewrote that block with valid OpenTofu syntax.

## Review Notes
- The post now accurately describes a site-to-site VPN gateway configuration.
- Point-to-site VPN requires additional `vpn_client_configuration` settings, client address space, tunnel protocol, and authentication configuration, which are not part of this article after the scope correction.
- Azure is actively consolidating non-AZ VPN gateway SKUs toward AZ-supported SKUs. The example SKU remains documented, but AZ-supported SKUs are worth considering for new deployments.
