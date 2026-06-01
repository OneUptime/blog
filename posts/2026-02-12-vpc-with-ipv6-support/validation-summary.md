# Validation Summary: How to Set Up a VPC with IPv6 Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- AWS EC2 networking
- IPv6 and dual-stack subnets
- AWS CLI
- Security groups
- Network ACLs
- Internet gateways and egress-only internet gateways
- Terraform AWS provider

## Sources Consulted
- Amazon VPC User Guide: VPC CIDR blocks - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Amazon VPC User Guide: Compare IPv4 and IPv6 - https://docs.aws.amazon.com/vpc/latest/userguide/ipv4-ipv6-comparison.html
- Amazon VPC User Guide: Create a VPC using the AWS CLI - https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc.html
- Amazon VPC User Guide: Add IPv6 support for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- Amazon VPC User Guide: Egress-only internet gateways - https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- Amazon VPC User Guide: DNS64 and NAT64 - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-nat64-dns64.html
- Amazon VPC User Guide: NAT gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- Amazon EC2 User Guide: Security group rules - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html
- Amazon EC2 User Guide: Path MTU Discovery / MTU - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- AWS CLI Command Reference: create-vpc - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/create-vpc.html
- Terraform AWS Provider: aws_vpc - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS Provider: aws_route_table - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS Provider: aws_route_table_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- OneUptime blog link referenced in the post - https://oneuptime.com/blog/post/2026-02-12-security-groups-stateful-filtering/view

## Issues Found
- The post stated that NAT does not exist in IPv6 and that NAT gateways do not support IPv6. AWS NAT gateways support NAT64 for IPv6-only workloads reaching IPv4 destinations, while egress-only internet gateways are the correct AWS construct for outbound-only native IPv6 internet access. Updated the wording to distinguish native IPv6 egress from NAT64.
- The post described IPv6 CIDR sizes as fixed at /56 for VPCs and /64 for subnets. AWS now supports additional IPv6 CIDR sizes for VPCs and subnets, while the shown Amazon-provided setup commonly uses a /56 VPC block and /64 subnets. Updated the wording to avoid outdated absolutes.
- The Terraform example was labeled complete but did not associate the public and private route tables with their subnets. Added `aws_route_table_association` resources for both subnets so the route tables are applied.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI and Amazon VPC documentation rather than local `aws --help` output. Terraform was also not installed locally, so Terraform validation was performed against the official Terraform AWS provider documentation.
