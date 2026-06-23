# Validation Summary: How to Check if String Contains Substring in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform regular expression functions
- Terraform local values and variable validation
- AWS provider resources

## Sources Consulted
- HashiCorp Terraform `strcontains` function documentation: https://developer.hashicorp.com/terraform/language/functions/strcontains
- HashiCorp Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform `regexall` function documentation: https://developer.hashicorp.com/terraform/language/functions/regexall
- HashiCorp Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- HashiCorp Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- HashiCorp Terraform `split` function documentation: https://developer.hashicorp.com/terraform/language/functions/split
- HashiCorp Terraform `startswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/startswith
- HashiCorp Terraform `endswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/endswith
- HashiCorp Terraform built-in functions overview: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform locals block reference: https://developer.hashicorp.com/terraform/language/block/locals
- HashiCorp Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- HashiCorp Terraform changelog for Terraform 1.5.0: https://github.com/hashicorp/terraform/blob/main/CHANGELOG.md
- HashiCorp AWS provider `aws_backup_plan` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The conditional backup example referenced `aws_backup_vault.main.name` without declaring that resource in the snippet. Changed it to use a `backup_vault_name` input variable so the example does not rely on an undeclared resource.
- The section titled "Creating a Reusable Function" implied user-defined functions in Terraform, but Terraform configurations cannot define their own functions. Renamed the section to "Creating Reusable Checks" and adjusted the comment to describe local values as reusable checks.
- The `has_prefix` and `has_suffix` checks used `strcontains`, which checks anywhere in the string rather than the beginning or end. Changed those expressions to `startswith` and `endswith` so the code matches the prefix/suffix terminology.

## Review Notes
The regex examples are technically valid. Terraform documentation recommends using `regexall` plus a length check to test for a match, while `can(regex(...))` also works because `regex` raises an error when no match is found. Terraform CLI was not installed in the review environment, so validation was performed against official documentation rather than by running `terraform validate`.
