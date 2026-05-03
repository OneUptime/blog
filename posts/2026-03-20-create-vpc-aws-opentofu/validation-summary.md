# Validation Summary: How to Create a VPC with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL2 configuration language)
- AWS VPC (Virtual Private Cloud)
- AWS Subnets (public and private)
- AWS Internet Gateway
- AWS Route Tables and Route Table Associations
- AWS `aws_availability_zones` data source
- Terraform/OpenTofu `cidrsubnet` function

## Sources Consulted
- HashiCorp Terraform AWS provider docs — `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- HashiCorp Terraform AWS provider docs — `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp Terraform AWS provider docs — `aws_internet_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- HashiCorp Terraform AWS provider docs — `aws_route_table`, `aws_route_table_association`
- HashiCorp Terraform AWS provider docs — `aws_availability_zones` data source
- HCL2 native syntax spec: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Terraform/OpenTofu `cidrsubnet` function docs: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet

## Issues Found
1. **Invalid HCL2 syntax in variables.tf (lines 125-126 of original).** The original used semicolons to separate multiple attributes inside a one-line block:

   ```hcl
   variable "vpc_cidr"    { type = string; default = "10.0.0.0/16" }
   variable "az_count"    { type = number; default = 2 }
   ```

   Per the HCL2 native syntax specification, a `OneLineBlock` permits **at most one** attribute (`(Identifier "=" Expression)?`), and semicolons are not a recognized token/separator in HCL2 — attributes are newline-terminated. This would fail parsing with `terraform validate` / `tofu validate`. Replaced with proper multi-line `variable` blocks. The two truly single-attribute one-line blocks (`name`, `environment`) were left as-is since they are valid one-line blocks.

## Review Notes
- The `cidrsubnet` math in the "CIDR Allocation Explained" table is correct: `cidrsubnet("10.0.0.0/16", 8, n)` yields `10.0.n.0/24` for `n = 0..5`, matching the table.
- The post explicitly walks through `az_count = 3` in the table even though the variable default is `2` — the text introduces this assumption clearly, so it is not an inaccuracy.
- All resource attributes (`enable_dns_hostnames`, `enable_dns_support`, `map_public_ip_on_launch`, `route { cidr_block, gateway_id }`, etc.) are valid for current versions of the AWS provider.
- The conclusion correctly notes that a NAT Gateway is needed for private subnets to reach the internet — none is configured in this post, so private-subnet instances will have no outbound connectivity until that is added. This is acknowledged appropriately as a "next step."
- Minor stylistic note (not changed): the inline one-line blocks for `name` and `environment` mix style with the multi-line blocks; some users prefer all blocks to be multi-line for consistency, but this is purely stylistic and not a technical issue.
