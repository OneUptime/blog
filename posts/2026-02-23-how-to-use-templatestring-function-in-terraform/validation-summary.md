# Validation Summary: How to Use the templatestring Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform string templates
- Terraform `templatestring` and `templatefile` functions
- Terraform `jsonencode` and `yamlencode` functions

## Sources Consulted
- HashiCorp Terraform documentation: `templatestring` function, https://developer.hashicorp.com/terraform/language/functions/templatestring
- HashiCorp Terraform documentation: `templatefile` function, https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform documentation: Strings and Templates, https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform documentation: `jsonencode` function, https://developer.hashicorp.com/terraform/language/functions/jsonencode
- HashiCorp Terraform documentation: `yamlencode` function, https://developer.hashicorp.com/terraform/language/functions/yamlencode
- HashiCorp Terraform v1.9 documentation: `templatestring` function, https://developer.hashicorp.com/terraform/language/v1.9.x/functions/templatestring
- HashiCorp blog: Terraform 1.9 enhances input variable validations, https://www.hashicorp.com/blog/terraform-1-9-enhances-input-variable-validations

## Issues Found
- The post said `templatestring` was introduced in Terraform 1.7. HashiCorp's Terraform 1.9 announcement describes `templatestring` as a new built-in function, so this was corrected to Terraform 1.9.
- Several examples passed literal quoted strings or heredocs directly as the first argument to `templatestring`. Terraform documentation states the first argument must be a reference to a string value defined in the module, so examples were changed to pass locals or variables.
- Template placeholders inside HCL string literals were not escaped. Terraform would try to evaluate `${...}` and `%{...}` while constructing the string, before `templatestring` received it. These were corrected with `$${...}` and `%%{...}` where the template is written in HCL.
- The JSON and YAML examples manually assembled structured data with interpolation. Terraform documentation recommends `jsonencode` and `yamlencode` for structured output so quoting and escaping remain valid, so those examples were updated to call the encoding functions from inside the rendered template.
- The escaping example used an invalid shell-style date expression and did not account for the two layers of template parsing. It was changed to demonstrate preserving a shell-style `${HOME}` reference in the final rendered output.

## Review Notes
Terraform was not installed in the local environment, so validation was performed against the official HashiCorp documentation rather than by running `terraform console` or `terraform validate`.
