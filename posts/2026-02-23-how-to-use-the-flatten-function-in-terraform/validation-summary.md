# Validation Summary: How to Use the flatten Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform configuration language
- Terraform collection functions
- Terraform `for` expressions
- Terraform `for_each`
- AWS Terraform provider resources used as examples

## Sources Consulted
- HashiCorp Terraform documentation: `flatten` function - https://developer.hashicorp.com/terraform/language/functions/flatten
- HashiCorp Terraform documentation: `concat` function - https://developer.hashicorp.com/terraform/language/functions/concat
- HashiCorp Terraform documentation: `for` expressions - https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Terraform documentation: expressions and Terraform console - https://developer.hashicorp.com/terraform/language/expressions

## Issues Found
- The post described `flatten` as handling arbitrarily nested lists without qualifying that Terraform only flattens directly nested lists. Updated the introduction and definition to say "directly nested" and added an edge-case note that lists nested inside maps or objects are not flattened, matching the official Terraform documentation.

## Review Notes
The remaining examples and explanations align with the official Terraform documentation. Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform console`.
