# Validation Summary: How to Use String Interpolation Best Practices in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCL
- Terraform string templates and interpolation
- Terraform built-in functions
- Terraform sensitive values

## Sources Consulted
- HashiCorp Terraform documentation: Strings and Templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform documentation: format Function: https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform documentation: jsonencode Function: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- HashiCorp Terraform documentation: templatefile Function: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform documentation: Manage sensitive data in your configuration: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Terraform documentation: sensitive Function: https://developer.hashicorp.com/terraform/language/functions/sensitive
- HashiCorp Terraform documentation: nonsensitive Function: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- HashiCorp Terraform documentation: Input variables: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform documentation: Output values: https://developer.hashicorp.com/terraform/language/values/outputs

## Issues Found
- The dollar-sign escaping guidance incorrectly said to use `$$` in `templatefile` templates to produce a literal `$`. Terraform's documented escape sequence is `$${` for producing a literal `${`; ordinary `$` characters that do not start `${` are already literal. Updated the examples accordingly.
- The sensitive-values section incorrectly said that interpolating a sensitive variable into a string loses the sensitive marking. Terraform automatically treats expressions that reference sensitive variables or outputs as sensitive. Updated the section to explain that the expression remains sensitive, while outputs should still be marked `sensitive = true` and state exposure remains a concern.

## Review Notes
The remaining examples align with Terraform's current string template syntax, interpolation behavior, heredoc syntax, template directives, and documented `format`, `join`, and `jsonencode` functions. The Terraform CLI was not installed in the workspace, so syntax validation was performed against official HashiCorp documentation rather than by running `terraform validate`.
