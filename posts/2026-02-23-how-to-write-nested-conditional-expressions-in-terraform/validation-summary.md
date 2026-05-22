# Validation Summary: How to Write Nested Conditional Expressions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform conditional expressions
- Terraform local values and input variables
- Terraform built-in functions (`contains`, `lookup`, `try`)
- Terraform `count` meta-argument
- AWS provider resources (`aws_instance`, `aws_db_instance`)

## Sources Consulted
- Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- HCL native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Terraform `lookup` function documentation: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform input variable validation documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The post said Terraform's chained ternary conditional means "the rightmost ternary is evaluated first." The HCL specification describes conditional evaluation as evaluating the predicate and then selecting the second or third expression; errors from unselected result expressions are not passed through. I changed this to say chained ternaries group to the right and that the first condition selects a branch.
- The heading "Nested Conditionals with count and for_each" introduced an example that only uses `count`. I changed the heading to "Nested Conditionals with count" so the section matches the code.

## Review Notes
Terraform CLI was not installed in the review environment, so I could not run `terraform validate` locally. The examples were reviewed against Terraform and HCL official documentation for syntax and behavior.
