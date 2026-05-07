# Validation Summary: How to Configure AWS VPC IPv6 CIDR with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS VPC
- AWS Internet Gateway
- AWS CLI
- Terraform
- Terraform AWS Provider
- IPv6 networking

## Sources Consulted
- Terraform AWS Provider `aws_vpc` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown
- Terraform AWS Provider `aws_subnet` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- Terraform AWS Provider `aws_route_table` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route_table.html.markdown
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS VPC CIDR blocks documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS Add IPv6 support for your VPC documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- AWS Internet Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS CLI `describe-vpcs` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html

## Issues Found
- The verification step used `terraform output -raw vpc_id`, but the post only defined a `vpc_ipv6_cidr` output. I added `output "vpc_id"` to the Terraform example and adjusted the output comment so the AWS CLI verification command works as written.

## Review Notes
- The Terraform examples match current AWS VPC IPv6 behavior: Amazon-provided IPv6 CIDR blocks are /56 at the VPC level, and subnet IPv6 CIDR blocks must be /64.
- `assign_ipv6_address_on_creation = true` correctly enables automatic IPv6 assignment for new network interfaces in the subnet. For IPv4 internet access, instances would still need a public IPv4 address, typically via `map_public_ip_on_launch = true` or an Elastic IP.
- The post pins the AWS provider to `~> 5.0`. The arguments used in the article are still valid in current provider documentation as of 2026-05-07.
- Local command validation with `terraform` or `aws` was not run in this workspace because those CLIs were not installed.
