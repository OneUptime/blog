# Validation Summary: How to Vary Attributes Based on count.index in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform `count` and `count.index`
- Terraform expressions and functions (`element`, `cidrsubnet`, `lookup`, `tostring`, `flatten`, `range`)
- AWS Terraform provider resources (`aws_instance`, `aws_subnet`, `aws_security_group`, `aws_vpc_security_group_ingress_rule`)

## Sources Consulted
- Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `element` function reference: https://developer.hashicorp.com/terraform/language/functions/element
- Terraform `cidrsubnet` function reference: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `lookup` function reference: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform operators reference: https://developer.hashicorp.com/terraform/language/expressions/operators
- Terraform type constraints reference: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule

## Issues Found
- The security group rule example used `aws_security_group_rule`. The current AWS provider documentation recommends avoiding that resource and using `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` instead. Updated the example to use `aws_vpc_security_group_ingress_rule` with `cidr_ipv4` and `ip_protocol`.
- The "Using Maps for Complex Configurations" section described the variable as a list of maps, but the snippet uses `list(object(...))`. Updated the wording to "list of objects" to match the actual Terraform type constraint.

## Review Notes
- The Terraform language examples for `count.index`, list indexing, conditionals, arithmetic operators, `element`, `cidrsubnet`, `lookup`, `tostring`, `flatten`, and `for_each` align with the current Terraform documentation.
- Several snippets are illustrative and assume surrounding provider/VPC configuration exists, so they are not all complete standalone Terraform modules.
