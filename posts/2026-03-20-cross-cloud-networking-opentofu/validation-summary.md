# Validation Summary: How to Set Up Cross-Cloud Networking with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Site-to-Site VPN (`aws_vpn_gateway`, `aws_customer_gateway`, `aws_vpn_connection`)
- AWS Secrets Manager (`aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`)
- Azure VPN Gateway (`azurerm_virtual_network_gateway`, `azurerm_local_network_gateway`, `azurerm_virtual_network_gateway_connection`, `azurerm_public_ip`, `azurerm_subnet`)
- GCP Classic Cloud VPN (`google_compute_vpn_gateway`, `google_compute_vpn_tunnel`, `google_compute_forwarding_rule`, `google_compute_address`, `google_compute_route`)
- HashiCorp `random_password` provider
- IPsec / IKE / NAT-T networking concepts

## Sources Consulted
- AzureRM provider — `azurerm_virtual_network_gateway`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- AzureRM provider — `azurerm_local_network_gateway`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/local_network_gateway
- AzureRM provider — `azurerm_virtual_network_gateway_connection`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- AWS provider — `aws_customer_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/customer_gateway
- AWS provider — `aws_vpn_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Google provider — `google_compute_vpn_tunnel`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_vpn_tunnel
- Google provider — `google_compute_vpn_gateway`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_vpn_gateway
- Google provider — `google_compute_route`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_route
- Google Cloud — Create a Classic VPN gateway using static routing: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-static-vpns
- Google Cloud — Cloud VPN overview: https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Microsoft Learn — Azure VPN BGP overview (default ASN 65515): https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-bgp-overview

## Issues Found
1. **Missing UDP 4500 forwarding rule for GCP Classic VPN.** The AWS-to-GCP section originally created only two forwarding rules (ESP and UDP 500). GCP Classic VPN requires three forwarding rules — ESP, UDP 500, and UDP 4500 (NAT-T / IKE NAT-Traversal). UDP 4500 is mandatory when peering with AWS Site-to-Site VPN because AWS endpoints sit behind AWS-managed NAT and IKE auto-detects NAT, switching to UDP 4500 for IKE and ESP-in-UDP encapsulation. Without this rule, the tunnel will fail to establish.
   - **Fix applied:** Added a third `google_compute_forwarding_rule "udp4500"` resource block and added it to the `depends_on` list of `google_compute_vpn_tunnel.to_aws`.

## Review Notes
- The post references `aws_vpn_connection.to_gcp.tunnel1_address` in the GCP section without defining that AWS-side resource block in the snippet. This is a tutorial-style elision — the AWS side mirrors the AWS-Azure pattern shown earlier — and is acceptable for a guide that focuses on the GCP side. A future revision could include an explicit AWS-side `aws_customer_gateway` and `aws_vpn_connection` for the GCP peer for completeness.
- The post uses GCP Classic VPN (`google_compute_vpn_gateway`). Google now recommends HA VPN (`google_compute_ha_vpn_gateway`) for new production deployments, which provides 99.99% SLA versus 99.9% for Classic VPN. Classic VPN is still supported but not the default recommendation — a future revision could mention HA VPN as the modern alternative.
- The Azure GatewaySubnet uses /27 (`10.1.255.0/27`), which meets Azure's minimum (/29) but Microsoft recommends /27 or larger for active-active and zone-redundant SKUs; the chosen size is acceptable for the `VpnGw1` SKU shown.
- The AWS VPN connection only references `tunnel1_address` on the Azure and GCP sides. AWS Site-to-Site VPN provides two redundant tunnels (`tunnel1_address`, `tunnel2_address`) for HA — using only one tunnel is a simplification appropriate to a tutorial but not best practice for production.
- The mermaid diagram uses `\n` for line breaks in node labels. Most modern Mermaid renderers accept `<br/>` as the canonical line-break syntax; `\n` works in many renderers but is less portable. Cosmetic, not a technical error.
