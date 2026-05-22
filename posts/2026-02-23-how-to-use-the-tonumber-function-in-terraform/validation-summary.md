# Validation Summary: How to Use the tonumber Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform Configuration Language
- Terraform type conversion functions
- Terraform variable validation
- AWS Terraform provider resources

## Sources Consulted
- HashiCorp Terraform `tonumber` function documentation: https://developer.hashicorp.com/terraform/language/functions/tonumber
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform CLI environment variables documentation: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- HashiCorp Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- HashiCorp Terraform `max` function documentation: https://developer.hashicorp.com/terraform/language/functions/max
- HashiCorp Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- HashiCorp AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
- The post stated that environment variables are always strings in Terraform. Shell environment variable values are strings, but Terraform input variables still have declared types and can be converted by Terraform. Updated the wording to say environment variable values arrive from the shell as strings and are often provided as strings.
- The `total_capacity` output example filtered `values(var.scaling_config)` with `regex("desired$", v)`, which tested numeric values like `"4"` and `"6"` instead of keys like `"web.desired"` and `"api.desired"`. Changed the for expression to iterate over `for k, v in var.scaling_config` and filter on `k`.
- The edge-case section claimed `tonumber("1e3")` and `tonumber("1.5e2")` return numeric values. Official Terraform documentation says `tonumber` accepts strings containing decimal representations of numbers, so scientific notation strings are not valid examples. Replaced those examples with an error note.
- The edge-case section said leading/trailing whitespace may error depending on version. Updated it to state that whitespace-wrapped strings are not decimal representations and therefore error.

## Review Notes
Terraform often performs automatic type conversion where a provider argument has an expected type, so some examples use `tonumber` more explicitly than strictly necessary. This is still valid for a tutorial focused on normalizing string data before numeric operations.
