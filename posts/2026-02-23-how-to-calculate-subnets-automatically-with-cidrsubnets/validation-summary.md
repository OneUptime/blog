# Validation Summary: How to Calculate Subnets Automatically with cidrsubnets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform IP network functions (`cidrsubnet`, `cidrsubnets`)
- AWS VPC and subnets
- AWS availability zones data source

## Sources Consulted
- HashiCorp Terraform `cidrsubnets` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnets
- HashiCorp Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp Terraform function argument expansion documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls#expanding-function-arguments
- HashiCorp Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- HashiCorp Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- HashiCorp Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- HashiCorp AWS Provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp AWS Provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- OneUptime linked blog post: https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view

## Issues Found
- The post incorrectly described `cidrsubnets` as allocating larger subnets first and filling smaller ranges around them. Terraform allocates subnet ranges in the order the `newbits` arguments are provided, aligning each result on the required CIDR boundary. Updated the explanation to match Terraform's documented behavior.
- The first `cidrsubnets("10.0.0.0/16", 8, 4, 8, 8)` example listed the final two `/24` subnets as `10.0.1.0/24` and `10.0.2.0/24`. Because the `/20` occupies `10.0.16.0/20` through `10.0.31.255`, the next aligned `/24` results are `10.0.32.0/24` and `10.0.33.0/24`. Updated the comments.
- The three-tier example listed database subnet outputs as `10.0.3.0/24`, `10.0.4.0/24`, and `10.0.5.0/24`. With the requested order of three `/24`s, three `/20`s, then three `/24`s, Terraform returns database subnets starting at `10.0.64.0/24`. Updated the output comments.
- The AWS tier-splitting expression used `sum([...])` on an empty list for the first tier. Terraform's `sum` function fails on an empty list or set. Updated the expression to use `sum(concat([0], ...))`, making the first tier start offset valid.
- The post overgeneralized that the examples work with any VPC size. Updated the wording to clarify that the requested subnet prefixes must fit inside the parent CIDR block.

## Review Notes
The code snippets are illustrative and depend on surrounding variables/provider configuration such as `var.project_name`, `var.vpc_cidr`, `var.az_count`, and the AWS provider. The configurable map example uses `keys(var.subnet_config)`, which Terraform returns in lexicographical order; this is stable but may not match the visual order in the default map.
