# Validation Summary: How to Configure VPN Connections on AWS with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway (VGW)
- AWS Customer Gateway (CGW)
- AWS VPC / Route Tables
- Terraform AWS provider (hashicorp/aws)
- AWS CLI (ec2 describe-vpn-connections)

## Sources Consulted
- Terraform AWS provider — aws_customer_gateway: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/customer_gateway
- Terraform AWS provider — aws_vpn_gateway: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway
- Terraform AWS provider — aws_vpn_connection: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider — aws_vpn_connection_route: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection_route
- Terraform AWS provider — aws_vpn_gateway_route_propagation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway_route_propagation
- AWS Site-to-Site VPN User Guide: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html
- AWS CLI reference — describe-vpn-connections: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpn-connections.html
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/

## Issues Found
No technical issues found.

## Review Notes
- All resource arguments (`bgp_asn`, `ip_address`, `type`, `vpc_id`, `amazon_side_asn`, `customer_gateway_id`, `vpn_gateway_id`, `static_routes_only`, `destination_cidr_block`, `route_table_id`) are valid and current on the AWS provider.
- Output attributes `tunnel1_address`, `tunnel2_address`, and `tunnel1_preshared_key` are correctly marked sensitive where applicable and match the `aws_vpn_connection` schema.
- The ASN values used (customer 65000, Amazon side 64512) are valid private ASNs.
- The `describe-vpn-connections` JMESPath query is valid and returns tunnel telemetry status and outside IP, which matches the intent.
- Minor future improvement: the post could mention the `aws_vpc` and `aws_route_table.private` resources are assumed to exist elsewhere in the configuration, but this is a reasonable omission for a focused tutorial.
