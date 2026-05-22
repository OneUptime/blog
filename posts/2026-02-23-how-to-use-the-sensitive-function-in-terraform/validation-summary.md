# Validation Summary: How to Use the sensitive Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform `sensitive` and `nonsensitive` functions
- Terraform sensitive variables and outputs
- Terraform state handling
- AWS provider resources and data sources
- Random provider `random_password` resource

## Sources Consulted
- Terraform sensitive function documentation: https://developer.hashicorp.com/terraform/language/functions/sensitive
- Terraform nonsensitive function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- Terraform sensitive variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform sensitive outputs documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform manage sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform output command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS provider `aws_secretsmanager_secret_version` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Random provider `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password

## Issues Found
- The post described sensitive values as being hidden from "logs" broadly. Terraform documentation is more specific: sensitive values are redacted from normal Terraform CLI output and HCP Terraform UI output, but state and plan files still contain the values and some CLI modes can expose them. Updated the description and introduction to say normal plan, apply, and CLI display instead.
- The post said Terraform replaces sensitive values in all plan and apply output. Updated this to "usually" and "normal plan and apply output" to avoid overstating redaction behavior, especially for machine-readable output and stored plan/state data.
- The computed secrets example said derived values from `random_password` might not be sensitive. Terraform propagates sensitivity through expressions, and `random_password.result` is documented as sensitive. Updated the comment to explain that wrapping the whole object makes the sensitivity explicit.
- The data source section implied the AWS Secrets Manager data source result might not be marked sensitive. Reworded it to cover provider attributes generally and to clarify that `sensitive()` can be used to explicitly mark a decoded result.
- The limitations section said sensitivity only affects CLI output. Updated it to specify normal CLI and HCP Terraform UI display while noting that state and plan files still contain the values.

## Review Notes
Terraform CLI is not installed in the workspace, so examples were reviewed against official documentation and HCL syntax by inspection rather than by running `terraform validate`. The examples are illustrative and omit provider setup and some referenced resources, which is acceptable for this focused function guide.
