# Validation Summary: How to Use the index Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform collection functions
- Terraform expression functions
- HashiCorp AWS provider resources
- HCL configuration syntax

## Sources Consulted
- HashiCorp Terraform documentation: Built-in functions: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform documentation: index function: https://developer.hashicorp.com/terraform/language/functions/index_function
- HashiCorp Terraform documentation: contains function: https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform documentation: try function: https://developer.hashicorp.com/terraform/language/functions/try
- HashiCorp Terraform documentation: sort function: https://developer.hashicorp.com/terraform/language/functions/sort
- HashiCorp Terraform documentation: format function: https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform documentation: split function: https://developer.hashicorp.com/terraform/language/functions/split
- HashiCorp Terraform documentation: element function: https://developer.hashicorp.com/terraform/language/functions/element
- HashiCorp Terraform documentation: cidrsubnet function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform Registry: AWS provider aws_vpc resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform Registry: AWS provider aws_subnet resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform Registry: AWS provider aws_instance resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: AWS provider aws_security_group resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The cross-referencing example used `aws_subnet.main.id` in the `aws_instance` resource without defining `aws_subnet.main` in the same snippet. Added a minimal `aws_subnet` resource using `aws_vpc.main.id` and `cidrsubnet(local.vpc_cidr, 8, 0)` so the example is internally consistent.
- The multi-tier architecture example referenced `aws_vpc.main.id` and `aws_vpc.main.cidr_block` without defining `aws_vpc.main` in the same snippet. Added a minimal `aws_vpc` resource with CIDR block `10.0.0.0/16`, matching the subnet CIDR ranges used by the example.

## Review Notes
Terraform and OpenTofu CLIs were not installed in the local environment, so examples were reviewed against the current official HashiCorp documentation and Terraform Registry provider documentation rather than executed locally.
