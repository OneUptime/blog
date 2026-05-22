# Validation Summary: How to Use Collection Functions for Data Transformation Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform configuration language (HCL)
- Terraform collection functions and expressions
- Terraform IP network functions
- AWS availability zone data source references

## Sources Consulted
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform function calls and argument expansion documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform flatten function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform sum function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- Terraform cidrsubnet function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform cidrsubnets function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnets

## Issues Found
- The hierarchical config example showed a sorted domain result, but the code only used `distinct(flatten(...))`. Terraform preserves the input traversal order for the resulting list, with map keys traversed lexically, so the comment did not match the expression. I changed the expression to `sort(distinct(flatten(...)))` so the code and result are consistent.
- The network CIDR allocation example used `cidrsubnet` with tier offsets based only on subnet counts. That can create overlapping CIDRs when tiers use different `newbits` values, such as `/20` public subnets followed by `/22` database subnets. I changed the pipeline to expand subnet specs first and allocate consecutive CIDRs with `cidrsubnets(var.vpc_cidr, local.subnet_specs[*].newbits...)`, which supports mixed subnet sizes without overlap.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The review was completed against the current official Terraform language and function documentation.
