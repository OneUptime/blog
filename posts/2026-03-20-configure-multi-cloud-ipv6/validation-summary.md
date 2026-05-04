# Validation Summary: How to Configure Multi-Cloud IPv6 Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 addressing (RFC 4291, RFC 3849, RFC 4193)
- AWS Site-to-Site VPN (Customer Gateway, Transit Gateway, VPN Connection)
- Azure VPN Gateway (RouteBased, VpnGw2 / Generation2)
- BGP (private ASNs, Azure default ASN 65515)
- Terraform (hashicorp/aws, hashicorp/azurerm providers)
- WireGuard (`wg`, `wg-quick`, IPv6 overlay)
- Python `subprocess` + `concurrent.futures.ThreadPoolExecutor`
- Linux `ping` / `ping6` ICMPv6 reachability checks

## Sources Consulted
- Terraform AWS provider — `aws_vpn_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider — `aws_ec2_transit_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- AWS Site-to-Site VPN User Guide — IPv6 traffic on Site-to-Site VPN connections (IPv6 inside tunnels supported only on Transit Gateway attachments)
- Terraform AzureRM provider — `azurerm_virtual_network_gateway`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway (VpnGw2 + Generation2 SKUs valid)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 4193 — Unique Local IPv6 Unicast Addresses (`fc00::/7`, ULA range)
- RFC 4291 — IPv6 Addressing Architecture (hex-only address representation)
- WireGuard documentation: https://www.wireguard.com/quickstart/
- iputils CHANGES (merging of `ping6` into `ping`): https://github.com/iputils/iputils/blob/master/CHANGES

## Issues Found

1. **Invalid IPv6 addresses throughout the post.** The originals used non-hexadecimal labels such as `2001:db8:aws::/48`, `2001:db8:azure::/48`, `2001:db8:gcp::/48`, `fd00:wg::aws/64`, `fd00:wg::azure/128`, `fd00:azure::/48`, and `2001:db8:aws::health`. IPv6 hextets are limited to characters `0-9` and `a-f` per RFC 4291, so `w`, `z`, `u`, `r`, `g`, `p`, `h`, `l`, `t`, `s` are not legal. These would fail to parse in Terraform, WireGuard, and Python. Replaced with valid documentation/ULA prefixes:
   - AWS: `2001:db8:a::/48` (and `2001:db8:a::1` for the health endpoint)
   - Azure: `2001:db8:b::/48` (and `2001:db8:b::1`)
   - GCP: `2001:db8:c::/48` (and `2001:db8:c::1`)
   - WireGuard interface/peer: `fd00:dead::1/64` and `fd00:dead::2/128`

2. **AWS IPv6 VPN incorrectly attached to a Virtual Private Gateway.** The original used `aws_vpn_gateway` with `local_ipv6_network_cidr` / `remote_ipv6_network_cidr`. AWS only supports IPv6 inside Site-to-Site VPN tunnels when the VPN attaches to an EC2 Transit Gateway (the Terraform docs explicitly note these IPv6 attributes and `tunnel_inside_ip_version = "ipv6"` are Transit-Gateway-only). Replaced `aws_vpn_gateway.main` with `aws_ec2_transit_gateway.main`, switched the connection from `vpn_gateway_id` to `transit_gateway_id`, and added `tunnel_inside_ip_version = "ipv6"`. Added a one-paragraph note explaining the constraint.

3. **Deprecated `ping6` command in the Python health check.** Modern Linux distributions (iputils s20150815 and later) merged `ping6` into `ping`, with `ping -6` as the supported form; `ping6` is a legacy symlink at best and missing on minimal images. Updated the `subprocess.run([...])` argv to `["ping", "-6", "-c", "3", "-W", "2", addr]`.

## Review Notes
- The `import json` at the top of the Python script is unused but harmless; left as-is to avoid stylistic edits.
- Azure default BGP ASN of `65515` is correct (Azure VPN Gateway permits a custom ASN, but `65515` remains the default).
- AWS `amazon_side_asn = 64512` is in the private ASN range (RFC 6996) and valid for a Transit Gateway.
- The `aws_customer_gateway.bgp_asn` value uses Azure's BGP ASN, which is the correct pattern when the AWS-side CGW represents the Azure VPN Gateway peer.
- The outer VPN endpoints remain IPv4 even with `tunnel_inside_ip_version = "ipv6"`; this is an AWS limitation (no IPv6 outer endpoints for Site-to-Site VPN at time of writing).
- The architecture diagram describes BGP at co-location facilities via Direct Connect / ExpressRoute / Cloud Interconnect; this is conceptually accurate but each provider has its own IPv6 BGP configuration mechanics (Direct Connect virtual interfaces, ExpressRoute peering, Cloud Interconnect VLAN attachments) — readers wanting to implement Option 2 will need provider-specific docs beyond what this post covers.
