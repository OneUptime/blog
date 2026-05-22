# Validation Summary: How to Use the parseint Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions
- AWS Terraform provider
- AWS Elastic Load Balancing target groups

## Sources Consulted
- HashiCorp Terraform `parseint` function documentation: https://developer.hashicorp.com/terraform/language/functions/parseint
- HashiCorp Terraform `tonumber` function documentation: https://developer.hashicorp.com/terraform/language/functions/tonumber
- HashiCorp Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- HashiCorp Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform `substr` function documentation: https://developer.hashicorp.com/terraform/language/functions/substr
- HashiCorp Terraform `floor` function documentation: https://developer.hashicorp.com/terraform/language/functions/floor
- HashiCorp Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- HashiCorp AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Elastic Load Balancing `CreateTargetGroup` API documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateTargetGroup.html

## Issues Found
- The post claimed Terraform does not have a built-in function to format numbers in different bases. Terraform's `format` function supports `%b`, `%o`, `%d`, `%x`, and `%X` for binary, octal, decimal, and hexadecimal integer formatting. Updated the "Converting Between Bases" section to say `format` can handle output formatting while `parseint` is used for input parsing.
- The post said `parseint` handles "any base" in one example comment. Terraform documents that `parseint` supports bases 2 through 62 inclusive. Updated the comment to match the documented range.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official HashiCorp and AWS documentation rather than executed locally.
