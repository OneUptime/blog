# Validation Summary: How to Create Site-to-Site VPN with AWS and Terraform

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway (VGW)
- AWS Customer Gateway (CGW)
- IPsec / IKEv2
- BGP (Border Gateway Protocol)
- AWS CloudWatch (alarms, metrics)
- AWS SNS (alert delivery)

## Sources Consulted
- Terraform AWS provider docs — `aws_vpn_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider docs — `aws_vpn_gateway`, `aws_customer_gateway`, `aws_vpn_connection_route`, `aws_vpn_gateway_route_propagation`
- AWS Site-to-Site VPN tunnel configuration: https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- AWS CloudWatch VPN monitoring: https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html
- RFC 5737 (TEST-NET ranges used in examples)
- RFC 6996 (Private ASN ranges)

## Issues Found
No technical issues found.

Verified specifically:
- All `aws_vpn_connection` tunnel arguments (`tunnelN_ike_versions`, `phase1/phase2_dh_group_numbers`, `encryption_algorithms`, `integrity_algorithms`, `lifetime_seconds`, `inside_cidr`, `tunnel_inside_ip_version`) are valid argument names with valid values.
- Encryption algorithm values "AES256" and "AES256-GCM-16" are accepted values.
- DH group numbers [14, 15, 16, 17, 18] are within the supported set (2, 14–24).
- Integrity algorithms SHA2-256/384/512 are valid.
- Phase 1 max lifetime 28800 seconds and Phase 2 max lifetime 3600 seconds are correct upper bounds.
- Inside CIDRs 169.254.10.0/30 and 169.254.11.0/30 are outside the reserved 169.254.x.x/30 ranges AWS prohibits.
- AWS-side ASN default 64512 is within the private ASN range.
- CloudWatch metric `TunnelState` (namespace `AWS/VPN`) and dimensions `VpnId` / `TunnelIpAddress` are correct.
- All `aws_vpn_connection` output attributes referenced (`tunnel1_address`, `tunnel2_address`, `tunnel1_bgp_asn`, `tunnel1_bgp_holdtime`, `tunnel1_inside_cidr`, `tunnel1_preshared_key`, `tunnel2_preshared_key`) are real exported attributes.
- Example public IPs (203.0.113.10, 198.51.100.20) are from RFC 5737 documentation ranges.

## Review Notes
- The "both tunnels down" alarm interpretation is correct but subtle: when aggregating `TunnelState` by `VpnId` only (no `TunnelIpAddress`), CloudWatch can return fractional values (0, 0.5, 1). With `Maximum` statistic and threshold 1, the alarm fires only when the max across the period is 0 — i.e., both tunnels have been down for the full period. This is the intended behavior but readers may want to be aware of the fractional value behavior described in the AWS CloudWatch VPN docs.
- The post correctly notes that `tunnel1_preshared_key` is sensitive and should be marked accordingly in outputs.
- The `aws_vpn_connection_route` resource in Step 4 references `var.static_routes_only` and `var.onprem_cidrs`; only `onprem_cidrs` is declared in the snippet. In a real module both variables would need to be declared together with the parent `aws_vpn_connection`'s `static_routes_only` argument — this is implied but worth noting.
- Phase 2 lifetime must be strictly less than Phase 1 lifetime; 3600 < 28800 satisfies this.
- The `tunnel_inside_ip_version = "ipv4"` line is in the right place; the alternative is `"ipv6"` which has additional requirements not covered here (acceptable scope decision).
