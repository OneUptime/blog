# Validation Summary: How to Create Site-to-Site VPN with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Site-to-Site VPN
- AWS Customer Gateway
- AWS Virtual Private Gateway
- AWS Transit Gateway
- AWS CloudWatch
- Terraform AWS Provider
- IPsec, IKEv2, BGP, NAT-Traversal

## Sources Consulted
- AWS Site-to-Site VPN User Guide: Customer gateway options: https://docs.aws.amazon.com/vpn/latest/s2svpn/cgw-options.html
- AWS Site-to-Site VPN User Guide: Configure tunnel options: https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- AWS Site-to-Site VPN User Guide: Accelerated VPN connections: https://docs.aws.amazon.com/vpn/latest/s2svpn/accelerated-vpn.html
- AWS Site-to-Site VPN User Guide: Monitor VPN tunnels with CloudWatch: https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html
- AWS Site-to-Site VPN User Guide: Static and dynamic routing: https://docs.aws.amazon.com/en_us/vpn/latest/s2svpn/vpn-static-dynamic.html
- AWS Site-to-Site VPN User Guide: Get started and route propagation: https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html
- Terraform Registry: aws_customer_gateway: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/customer_gateway
- Terraform Registry: aws_vpn_connection: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform Registry: aws_vpn_gateway and route propagation resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- Corrected the NAT guidance for customer gateways. AWS documentation says that when an IPv4 customer gateway device is behind NAT, the customer gateway should use the NAT device's static public IP address, not a private IP.
- Corrected the pre-shared key guidance. Terraform's AWS provider stores configured `tunnel1_preshared_key` and `tunnel2_preshared_key` argument values in state, even when variables are marked sensitive, so the post now warns readers to protect Terraform state and uses `preshared_key_storage = "SecretsManager"` for AWS-side PSK storage.
- Renamed the `tunnel1_inside_cidr` output to `tunnel1_vgw_inside_address` because the referenced Terraform attribute returns the AWS-side link-local inside address, not the /30 CIDR block.
- Clarified the acceleration tip. AWS Accelerated Site-to-Site VPN is supported only for VPN connections attached to a Transit Gateway, not Virtual Private Gateway VPN connections.

## Review Notes
The Terraform snippets reference surrounding resources such as `aws_vpc.main`, `aws_route_table.private`, and `aws_sns_topic.alerts` that are not defined in the article. That is acceptable for a focused tutorial, but a complete copy-paste module would need those dependencies and provider configuration.
