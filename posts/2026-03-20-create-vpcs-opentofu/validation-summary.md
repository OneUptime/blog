# Validation Summary: How to Create VPCs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HashiCorp Configuration Language (HCL2)
- AWS Provider (hashicorp/aws / opentofu/aws)
- AWS VPC, Subnets, Internet Gateway, NAT Gateway, Elastic IP, Route Tables, Route Table Associations
- AWS Availability Zones data source

## Sources Consulted
- AWS Provider documentation for `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS Provider documentation for `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS Provider documentation for `aws_internet_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- AWS Provider documentation for `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip (verified `domain = "vpc"` replaces deprecated `vpc = true`)
- AWS Provider documentation for `aws_nat_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- AWS Provider documentation for `aws_route_table` and `aws_route_table_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- AWS Provider data source `aws_availability_zones`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- HCL2 native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md (verified rules around `OneLineBlock` and attribute separators)
- OpenTofu documentation: https://opentofu.org/docs/

## Issues Found

1. **Invalid HCL2 syntax in the Variables block**: The original variable declarations used semicolons to separate multiple attributes in a single-line block, e.g. `variable "vpc_cidr" { type = string; default = "10.0.0.0/16" }`. The HCL2 native syntax specification only allows a `OneLineBlock` to contain at most a single attribute definition; multiple attributes must each appear on their own line, terminated by newlines. Semicolons are not valid attribute separators in HCL2 and OpenTofu/Terraform would reject this with a syntax error. Fixed by expanding each variable with multiple attributes into a multi-line block.

   The single-attribute outputs (e.g. `output "vpc_id" { value = aws_vpc.main.id }`) are valid `OneLineBlock` constructs and were left unchanged.

## Review Notes
- The use of `domain = "vpc"` on `aws_eip` is correct for AWS provider v5.x and later (the older `vpc = true` argument was deprecated and ultimately removed).
- The pattern of one NAT gateway per AZ is correct for high availability; readers should be aware that this incurs higher cost than a single NAT gateway and may want a comment about cost trade-offs in production.
- The `data.aws_availability_zones.available.names` lookup returns AZs in lexical order; if `var.public_subnet_cidrs` has more entries than the region has AZs, indexing will fail. This is a reasonable assumption for the demonstrated 3-subnet pattern but worth noting.
- The configuration assumes the AWS provider is configured elsewhere (e.g., a `provider "aws"` block or environment variables); this is standard but not explicitly mentioned in the post.
- No `terraform { required_providers { ... } }` block is shown, which is typical for snippet-style tutorials but readers should add one for real projects.
