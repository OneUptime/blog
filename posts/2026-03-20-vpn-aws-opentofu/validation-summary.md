# Validation Summary: How to Configure AWS VPN with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Terraform AWS provider (hashicorp/aws)
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway (VGW) and Customer Gateway (CGW)
- IPsec / IKEv2
- BGP routing
- Amazon CloudWatch (AWS/VPN metrics, alarms)
- Amazon SNS (alarm actions)

## Sources Consulted
- Terraform AWS provider — `aws_customer_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/customer_gateway
- Terraform AWS provider — `aws_vpn_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway
- Terraform AWS provider — `aws_vpn_gateway_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway_attachment
- Terraform AWS provider — `aws_vpn_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider — `aws_vpn_gateway_route_propagation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway_route_propagation
- Terraform AWS provider — `aws_vpn_connection_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection_route
- AWS Site-to-Site VPN monitoring with CloudWatch: https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html

## Issues Found
1. **Conflicting VPC attachment.** The original post set `vpc_id` on `aws_vpn_gateway` AND declared a separate `aws_vpn_gateway_attachment` resource. The provider docs explicitly state these two approaches are mutually exclusive — using both causes a conflict of associations. Removed the `aws_vpn_gateway_attachment` block (leaving `vpc_id` on the gateway) and added a comment explaining the two options so readers understand the choice.
2. **Incorrect CloudWatch dimension name.** The alarms used `TunnelIp` as the dimension key. Per the AWS Site-to-Site VPN monitoring documentation, the correct dimension is `TunnelIpAddress`. Fixed in both the tunnel 1 and tunnel 2 alarm blocks; with `TunnelIp` the alarms would fail to match any metric data.

## Review Notes
- `amazon_side_asn = 64512` is valid. The inline comment limits the range to 64512–65534; the full valid set also includes 4200000000–4294967294 (32-bit private ASNs) plus a few legacy Amazon values, but the 16-bit private range shown is the most commonly used, so the note is fine.
- `tunnel1_ike_versions`, Phase 1/2 encryption/integrity/DH-group settings, and `static_routes_only = false` all match allowed values in the provider schema.
- `TunnelState` metric values are 0 (DOWN) / 1 (UP) for static VPNs, and 0/1 (ESTABLISHED) for BGP VPNs, with fractional values possible during transitions; `LessThanThreshold` with `threshold = 1` and `statistic = "Minimum"` correctly triggers on any non-UP state during the evaluation window.
- Exported attributes (`tunnel1_address`, `tunnel1_cgw_inside_address`, `tunnel1_vgw_inside_address`, `customer_gateway_configuration`) are all present on `aws_vpn_connection`.
- Only tunnel 1 has the full phase 1/2 algorithm set defined; tunnel 2 only specifies PSK and IKE version. This is functionally valid (AWS defaults apply for the unspecified algorithms on tunnel 2) but readers running in production should mirror the phase settings on both tunnels for consistent policy.
