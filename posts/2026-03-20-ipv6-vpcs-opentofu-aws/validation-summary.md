# Validation Summary: How to Create IPv6 VPCs with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- AWS subnets
- AWS Internet Gateway
- AWS Egress-Only Internet Gateway
- IPv6 and dual-stack networking

## Sources Consulted
- AWS VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS subnet configuration and routing behavior: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- AWS subnet route tables: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- AWS egress-only internet gateways: https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- AWS IPv6 on AWS whitepaper, Amazon VPC design: https://docs.aws.amazon.com/whitepapers/latest/ipv6-on-aws/amazon-vpc-design.html
- AWS IPv6 on AWS whitepaper, Amazon VPC internet access: https://docs.aws.amazon.com/whitepapers/latest/ipv6-on-aws/amazon-vpc-internet-access.html
- OpenTofu `cidrsubnet` function: https://opentofu.org/docs/v1.7/language/functions/cidrsubnet/
- OpenTofu `tofu init`: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- Terraform Registry `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform Registry `aws_availability_zones`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform Registry `aws_route_table_association`: https://registry.terraform.io/providers/hashicorp/aws/4.15.1/docs/resources/route_table_association

## Issues Found
- The subnet example referenced `data.aws_availability_zones.available.names[...]` without defining the `aws_availability_zones` data source. I added the missing data source so the snippet is self-contained and valid.
- The post created custom public and private route tables but never associated them with the subnets. On AWS, each subnet must be associated with a route table, and without explicit associations the subnets would continue using the VPC's main route table. I added `aws_route_table_association` resources for both public and private subnets so the routing behavior matches the article's explanation.

## Review Notes
- The OpenTofu commands in the post are current and correct: `tofu init`, `tofu plan`, and `tofu apply`.
- The IPv6 subnet sizing is correct for Amazon-provided VPC IPv6 CIDRs: a VPC receives an Amazon-provided `/56`, and subnets commonly use `/64` ranges carved from it.
- The public subnet example auto-assigns IPv6 addresses but does not enable automatic public IPv4 assignment. That is acceptable for this IPv6-focused guide, but EC2 instances would still need a public IPv4 address or Elastic IP if public IPv4 internet access is required.
- The local environment used for this review did not have the `tofu` binary installed, so CLI commands were verified against official OpenTofu documentation rather than executed locally.
