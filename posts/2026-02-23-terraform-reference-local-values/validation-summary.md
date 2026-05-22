# Validation Summary: How to Reference Local Values in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform local values
- Terraform input variables
- Terraform expressions and functions
- AWS Terraform provider resource examples

## Sources Consulted
- Terraform local values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- Terraform `locals` block reference: https://developer.hashicorp.com/terraform/language/block/locals
- Terraform references to named values: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables

## Issues Found
- The computed local values example used `local.common_tags` and `local.name_prefix` in the `aws_instance` resource without defining those locals in the snippet. Added `name_prefix` and `common_tags` to the same `locals` block so the example is internally consistent.
- The performance note claimed that locals are evaluated lazily and therefore have no performance penalty. The official Terraform documentation frames locals as a readability and reuse feature and warns that overuse can obscure where values originate. Replaced the unsupported performance claim with guidance aligned to the official documentation.

## Review Notes
The Terraform syntax for `locals` blocks, `local.<NAME>` references, references between local values, multiple `locals` blocks, `for` expressions, `cidrsubnet`, and variable usage matches the official Terraform documentation. Some AWS resource snippets remain illustrative and assume provider configuration and referenced resources such as security groups exist elsewhere.
