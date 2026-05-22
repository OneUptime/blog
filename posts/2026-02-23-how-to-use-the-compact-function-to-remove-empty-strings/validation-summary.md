# Validation Summary: How to Use the compact Function to Remove Empty Strings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions
- AWS Terraform provider resources

## Sources Consulted
- Terraform `compact` function documentation: https://developer.hashicorp.com/terraform/language/functions/compact
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- Terraform `trimspace` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimspace
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `toset` function documentation: https://developer.hashicorp.com/terraform/language/functions/toset
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- AWS provider `aws_iam_role_policy_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The post incorrectly stated that Terraform's `compact` function only removes empty strings and that null elements would cause a type error. Official Terraform documentation says `compact` removes both null and empty string elements from a list of strings. Updated the definition, basic example, console example, "What compact Does NOT Do" note, performance note, and summary wording to reflect that `null` values are removed.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform console`. The AWS provider snippets are illustrative and reference resources or variables not fully defined in the excerpt, but the shown arguments and Terraform expression patterns are valid.
