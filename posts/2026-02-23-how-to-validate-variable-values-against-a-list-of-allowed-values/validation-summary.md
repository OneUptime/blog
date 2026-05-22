# Validation Summary: How to Validate Variable Values Against a List of Allowed Values

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variable validation
- Terraform built-in functions: `contains`, `alltrue`, `can`, `regex`, `lower`, `join`, `one`, and `try`
- AWS CloudWatch Logs retention settings
- AWS Availability Zone naming

## Sources Consulted
- HashiCorp Terraform documentation: Input variables and variable validation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform documentation: Validate your configuration: https://developer.hashicorp.com/terraform/language/validate
- HashiCorp Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform `contains` function: https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform `alltrue` function: https://developer.hashicorp.com/terraform/language/functions/alltrue
- HashiCorp Terraform `one` function: https://developer.hashicorp.com/terraform/language/functions/one
- HashiCorp Terraform `try` function: https://developer.hashicorp.com/terraform/language/functions/try
- HashiCorp Terraform 1.9 input variable validation announcement: https://www.hashicorp.com/blog/terraform-1-9-enhances-input-variable-validations
- AWS CloudWatch Logs `PutRetentionPolicy` API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html
- AWS Availability Zones documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html

## Issues Found
- The CloudWatch Logs retention-days example omitted currently supported values: `1096`, `2192`, `2557`, `2922`, and `3288`. Updated the allowed list to match the AWS `PutRetentionPolicy` API reference.
- The `one()` section said to use `one()` but the example used `length(...) == 1` instead. Updated the example to use `try(one([...]) == var.log_level, false)` so the code matches the explanation and remains a boolean validation condition.
- The example that references `local.allowed_environments` from inside variable validation requires Terraform 1.9 or later. Added a short version caveat based on HashiCorp's Terraform 1.9 input validation change.

## Review Notes
Terraform CLI is not installed in this workspace, so I could not run `terraform validate`. The snippets were reviewed statically against current official Terraform and AWS documentation.
