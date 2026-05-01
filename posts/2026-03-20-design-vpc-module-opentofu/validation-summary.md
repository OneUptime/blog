# Validation Summary: How to Design a VPC Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS VPC
- AWS subnets
- AWS NAT Gateway
- AWS route tables

## Sources Consulted
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `dynamic` blocks: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- OpenTofu custom conditions and preconditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- AWS provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS provider `aws_vpc` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_eip` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS provider `aws_nat_gateway` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- AWS provider `aws_route_table` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- AWS provider `aws_route_table_association` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association

## Issues Found
- The original snippet never associated private subnets with the private route tables. I added `aws_route_table_association "private"` so private subnets actually use the intended route tables.
- The original NAT gateway count was derived from all discovered AZs, which could exceed the number of created public subnets and make `aws_nat_gateway.main[count.index]` index past `aws_subnet.public`. I changed the NAT count to align with the selected AZs/public subnets actually available.
- The original AZ auto-discovery could include Local Zones. I added the documented `opt-in-status = "opt-in-not-required"` filter so auto-discovery returns standard Availability Zones only.
- The original HCL used semicolon-separated arguments inside blocks, which is not valid HCL for these examples. I rewrote those snippets into standard multiline block syntax.
- The original module accepted subnet CIDR lists with mismatched lengths even though the design assumes paired public/private subnets. I added resource preconditions to require at least one public and one private subnet CIDR and to keep the public/private subnet counts aligned.
- The conclusion said callers could control the “AZ count,” but the module interface actually exposes an AZ list. I corrected that wording to match the implementation.

## Review Notes
- The post is technically sound after the fixes above.
- The module structure mentions `versions.tf` but the post does not show its contents. In a real module, that file should pin the required OpenTofu and AWS provider versions so behavior stays predictable across provider releases.
