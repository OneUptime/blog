# Validation Summary: How to Create a VPC with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL)
- AWS VPC
- AWS Internet Gateway
- AWS Subnets (public/private)
- AWS Route Tables and Route Table Associations
- AWS NAT Gateway
- AWS Elastic IP (EIP)
- AWS provider (Terraform/OpenTofu) data source `aws_availability_zones`

## Sources Consulted
- AWS provider documentation for `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider documentation for `aws_internet_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- AWS provider documentation for `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider documentation for `aws_route_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- AWS provider documentation for `aws_route_table_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- AWS provider documentation for `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip (the `vpc` argument was deprecated in favor of `domain = "vpc"`)
- AWS provider documentation for `aws_nat_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- AWS provider data source `aws_availability_zones`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- OpenTofu language docs for `cidrsubnet`: https://opentofu.org/docs/language/functions/cidrsubnet/

## Issues Found
- The original post referenced `var.environment` inside the `aws_vpc` `tags` block but never declared the `environment` input variable. This would cause OpenTofu to error with "Reference to undeclared input variable." Added a `variable "environment"` declaration with a default of `"dev"` next to the existing `variable "vpc_cidr"` declaration so the snippet is self-contained and applies cleanly.

## Review Notes
- `aws_eip` correctly uses `domain = "vpc"`. The older `vpc = true` argument is deprecated.
- `cidrsubnet("10.0.0.0/16", 8, count.index)` produces `10.0.0.0/24` and `10.0.1.0/24` for public subnets, and `10.0.10.0/24` and `10.0.11.0/24` for private subnets — correct, non-overlapping ranges.
- `enable_dns_hostnames` and `enable_dns_support` are valid `aws_vpc` arguments.
- The post does not include an AWS provider block or `terraform { required_providers { ... } }` declaration. This is a stylistic omission rather than a technical error in the snippets shown — readers running this end-to-end would also need a provider configuration, but adding it was out of scope for this targeted fix.
- The NAT Gateway costs money even when idle; users following this guide should be aware. Not a correctness issue.
