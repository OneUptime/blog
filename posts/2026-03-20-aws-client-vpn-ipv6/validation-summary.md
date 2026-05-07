# Validation Summary: How to Configure AWS Client VPN IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Client VPN
- Amazon VPC
- IPv6
- AWS CLI
- Terraform
- OpenVPN-compatible VPN clients

## Sources Consulted
- AWS Client VPN endpoints: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoints.html
- IPv6 considerations for AWS Client VPN: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/ipv6-considerations.html
- Create an AWS Client VPN endpoint: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoint-create.html
- How AWS Client VPN works: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/how-it-works.html
- Associate a target network with an AWS Client VPN endpoint: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-target-associate.html
- Create an AWS Client VPN endpoint route: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes-create.html
- AWS Client VPN authorization rules: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html
- Export the AWS Client VPN client configuration file: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/export-client-config-file.html
- AWS CLI `create-client-vpn-endpoint`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-client-vpn-endpoint.html
- AWS CLI `associate-client-vpn-target-network`: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-client-vpn-target-network.html
- AWS CLI `authorize-client-vpn-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-client-vpn-ingress.html
- AWS CLI `create-client-vpn-route`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-client-vpn-route.html
- AWS CLI `export-client-vpn-client-configuration`: https://docs.aws.amazon.com/cli/latest/reference/ec2/export-client-vpn-client-configuration.html
- Terraform AWS Provider `aws_ec2_client_vpn_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- Terraform AWS Provider `aws_ec2_client_vpn_network_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_network_association
- Terraform AWS Provider `aws_ec2_client_vpn_authorization_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_authorization_rule
- AWS What's New: AWS Client VPN now supports connectivity to IPv6 resources: https://aws.amazon.com/about-aws/whats-new/2025/08/aws-client-vpn-connectivity-ipv6-resources/

## Issues Found
- The post conflated AWS Client VPN with AWS Site-to-Site VPN and AWS Direct Connect. I removed the BGP and Direct Connect material because it does not apply to Client VPN.
- The original "enable IPv6" commands only inspected VPC attributes and associated an IPv6 CIDR with a VPC. I replaced them with the documented `create-client-vpn-endpoint` workflow and the current IPv6 and dual-stack endpoint parameters.
- The post used VPC route table commands (`aws ec2 create-route`) instead of Client VPN route behavior. I corrected this to the Client VPN workflow, including VPC authorization and reviewing the endpoint route table created for the associated target network.
- The testing section validated routes on VPC route tables and tested from a cloud instance, which does not validate Client VPN client behavior. I updated it to export the `.ovpn` configuration, inspect Client VPN routes, and test from a connected VPN client.
- The Terraform example used `aws_vpn_connection`, which is for Site-to-Site VPN, not Client VPN. I replaced it with `aws_ec2_client_vpn_endpoint`, `aws_ec2_client_vpn_network_association`, and `aws_ec2_client_vpn_authorization_rule`.
- The prerequisites used Azure terminology (`VNet`) and omitted certificate and client-authentication requirements. I corrected the prerequisites to match AWS Client VPN.

## Review Notes
- Native AWS Client VPN connectivity to IPv6 resources is a recent capability. AWS announced general availability on August 26, 2025, so older examples on the web often describe IPv4-only behavior or legacy IPv6 leak-prevention workarounds.
- AWS documentation is currently a little uneven around IPv6 wording for Client VPN routes and authorization rules. The product documentation now describes IPv6 and dual-stack endpoint support, while some lower-level scenario, CLI, and API references still describe some route and authorization CIDRs in IPv4 terms. The post was aligned to the clearest current AWS Client VPN IPv6 guidance and avoids overstating behavior where the docs are inconsistent.
- AWS documents that IPv6 clients do not support client-to-client communication.
- AWS documents that IPv6 Client Route Enforcement is available in AWS VPN Client version 5.3.0 and later on Windows, macOS, and Ubuntu.
