# Validation Summary: How to Use Count and For Each in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- Terraform `count` meta-argument
- Terraform `for_each` meta-argument
- AWS Terraform provider resources

## Sources Consulted
- Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform meta-arguments overview: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform splat expressions reference: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_iam_user_group_membership` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_group_membership

## Issues Found
- The post stated that `for_each` requires "a map or set." Terraform's official documentation specifies that `for_each` accepts a map or a set of strings. Changed the sentence to "`for_each` requires a map or set of strings. Use `toset()` to convert lists of strings."

## Review Notes
The examples are partial tutorial snippets and assume surrounding Terraform configuration, such as provider configuration, VPC resources, variables, AMI IDs, subnets, and existing IAM groups. The Terraform language examples use current syntax for `count`, `for_each`, splat expressions, for expressions, `flatten`, `range`, `toset`, `values`, `index`, and `cidrsubnet`.
