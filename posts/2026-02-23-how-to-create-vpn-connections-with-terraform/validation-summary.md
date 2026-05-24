# Validation Summary: How to Create VPN Connections with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform AWS provider (hashicorp/aws)
- AWS Client VPN (`aws_ec2_client_vpn_endpoint`, network associations, authorization rules, routes)
- AWS Site-to-Site VPN (`aws_vpn_gateway`, `aws_customer_gateway`, `aws_vpn_connection`)
- AWS Transit Gateway (`aws_ec2_transit_gateway`, `aws_ec2_transit_gateway_vpc_attachment`)
- AWS Certificate Manager (`aws_acm_certificate`)
- AWS CloudWatch Logs and Metric Alarms
- IPsec / IKEv2 tunnel parameters (DH groups, encryption, integrity)

## Sources Consulted
- Terraform AWS provider docs: `aws_ec2_client_vpn_endpoint` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- Terraform AWS provider docs: `aws_ec2_client_vpn_network_association` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_network_association
- Terraform AWS provider docs: `aws_ec2_client_vpn_route` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_route
- Terraform AWS provider docs: `aws_vpn_connection` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider docs: `aws_ec2_transit_gateway` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- AWS EC2 API Reference: CreateClientVpnEndpoint — https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateClientVpnEndpoint.html
- AWS Client VPN federated authentication / self-service portal — https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/federated-authentication.html
- AWS Site-to-Site VPN CloudWatch metrics — https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html

## Issues Found
- **`self_service_portal = "enabled"` on a certificate-authentication-only endpoint (line ~90).** The AWS Client VPN self-service portal is functionally tied to SAML/federated authentication — there is no portal flow for mutual-certificate users. Setting it to `enabled` on a cert-only endpoint has no practical effect and is misleading. Changed the value to `"disabled"` and added a comment explaining the option only takes effect with SAML/federated auth.

## Review Notes
- All Terraform AWS provider resource names and argument names verified against the current provider docs: `aws_ec2_client_vpn_endpoint`, `aws_ec2_client_vpn_network_association`, `aws_ec2_client_vpn_authorization_rule`, `aws_ec2_client_vpn_route`, `aws_vpn_gateway`, `aws_vpn_gateway_route_propagation`, `aws_customer_gateway`, `aws_vpn_connection`, `aws_ec2_transit_gateway`, `aws_ec2_transit_gateway_vpc_attachment`, `aws_acm_certificate`, `aws_security_group`, `aws_cloudwatch_log_group`, `aws_cloudwatch_log_stream`, `aws_cloudwatch_metric_alarm`.
- IPsec tunnel parameters are all valid for AWS Site-to-Site VPN: DH groups 14/15/16 (supported set is 2, 14–24), `ikev2`, `AES256`, `SHA2-256`.
- `client_cidr_block` of `172.16.0.0/16` is in the valid range (block size must be /22 or smaller and /12 or larger; /16 fits).
- `vpn_port = 443` and `transport_protocol = "udp"` are valid (alternative is port 1194; protocol can also be `tcp`).
- `vpn_ecmp_support = "enable"` is the correct string-valued enum for transit gateways (not boolean).
- CloudWatch alarms use namespace `AWS/VPN` with metrics `TunnelState` and `TunnelDataIn`, which are correct. The dimensions for these metrics are `VpnId` and `TunnelIpAddress`; using only `VpnId` is acceptable but aggregates across both tunnels — for per-tunnel alerting, including `TunnelIpAddress` would be more precise. Not corrected since the aggregate form is still functional.
- The `aws_acm_certificate.vpn_client` resource imports a client certificate with a private key. For Client VPN you only strictly need the root CA cert chain in ACM for `root_certificate_chain_arn`; importing the client cert+key works but is more than required. Left as-is — not a technical error.
- An `aws_ec2_client_vpn_network_association` automatically creates a route to each associated subnet's CIDR. The additional explicit `aws_ec2_client_vpn_route` entries targeting the same subnets are redundant for VPC-local access, but they are not incorrect. Left as-is.
