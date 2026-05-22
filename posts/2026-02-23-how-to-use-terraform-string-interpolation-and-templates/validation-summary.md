# Validation Summary: How to Use Terraform String Interpolation and Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- HCL string interpolation and templates
- Terraform `templatefile`, `format`, `formatlist`, `join`, `range`, `timestamp`, and `formatdate` functions
- Terraform heredoc strings
- AWS IAM JSON policies
- Docker Compose YAML

## Sources Consulted
- HashiCorp Terraform documentation: Strings and Templates - https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform documentation: `templatefile` function - https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform documentation: `format` function - https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform documentation: `formatlist` function - https://developer.hashicorp.com/terraform/language/functions/formatlist
- HashiCorp Terraform documentation: `range` function - https://developer.hashicorp.com/terraform/language/functions/range
- Docker documentation: Compose file `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- AWS IAM documentation: JSON policy `Version` element - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_version.html

## Issues Found
- The post said Terraform automatically converts non-string types to strings during interpolation. Terraform string interpolation converts values that can be converted to strings, but collection and structural values such as lists must be handled explicitly. Changed the wording to "primitive non-string values" to match the examples and Terraform's behavior.
- The Docker Compose template used `version: '3.8'`. Docker's current Compose documentation marks the top-level `version` property as obsolete and says it is only retained for backward compatibility. Removed the `version` line from the example.

## Review Notes
Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`. The Terraform examples use current template syntax, including interpolation sequences, `%{ }` directives, strip markers, `.tftpl` naming, and `templatefile` variable passing. The IAM policy `Version` value `2012-10-17` is current per AWS documentation. The internal OneUptime heredoc link returned HTTP 200.
