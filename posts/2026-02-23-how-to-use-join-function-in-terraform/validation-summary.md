# Validation Summary: How to Use the join Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform collection functions
- AWS provider resources

## Sources Consulted
- Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- Terraform `split` function documentation: https://developer.hashicorp.com/terraform/language/functions/split
- Terraform `compact` function documentation: https://developer.hashicorp.com/terraform/language/functions/compact
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform splat expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- AWS provider `aws_apigatewayv2_api` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api

## Issues Found
- The post described `join` and `split` as strict inverses. Terraform's official documentation describes `split` as performing the opposite operation to `join`, but they are not perfect inverses in every possible case, such as when list elements contain the separator. Changed this wording to "opposite" and narrowed the round-trip description to delimiter-based transformations.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed statically against official Terraform and AWS provider documentation.
