# Validation Summary: How to Display Sensitive Output Variables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform output values and sensitive values
- Terraform `nonsensitive()` function
- Terraform console
- HashiCorp Local provider `local_sensitive_file`
- AWS provider resources for API Gateway, Secrets Manager, and SSM Parameter Store
- GitHub Actions
- jq

## Sources Consulted
- HashiCorp Terraform CLI `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform outputs documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Terraform `nonsensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- HashiCorp Local provider `local_sensitive_file` documentation: https://github.com/hashicorp/terraform-provider-local/blob/main/docs/resources/sensitive_file.md
- HashiCorp AWS provider `aws_secretsmanager_secret_version` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- HashiCorp AWS provider `aws_ssm_parameter` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ssm_parameter.html.markdown
- HashiCorp AWS provider `aws_api_gateway_api_key` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_api_key.html.markdown
- GitHub Actions workflow commands documentation for masking values: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

## Issues Found
- The `terraform console` section claimed console queries display sensitive values directly. Official Terraform examples show sensitive values remain redacted as `(sensitive value)` in the console unless `nonsensitive()` is used. Updated the explanation and examples to show redaction first, then explicit use of `nonsensitive()`.
- The `terraform console` shell variable example used console output directly in a script. Console output is Terraform expression formatting, so strings can include quotes. Updated the script example to prefer `terraform output -raw` for shell usage.
- The local file pattern was described as writing an encrypted file. The `local_sensitive_file` resource marks content as sensitive in Terraform output/state handling and supports restricted file permissions, but it does not encrypt the local file. Renamed the pattern and comment to "restricted local file."
- The best-practices list suggested adding debug outputs to `.gitignore`. Terraform output blocks are configuration, not generated files. Reworded this to avoid committing debug output blocks or files containing output values.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation instead of local `terraform --help` output. The post remains accurate as a guide for Terraform 0.15+ sensitive output behavior, with current Terraform documentation also noting newer ephemeral and write-only options for cases where secrets should not be stored in state.
