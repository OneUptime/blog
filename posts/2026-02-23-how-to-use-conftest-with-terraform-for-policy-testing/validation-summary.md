# Validation Summary: How to Use Conftest with Terraform for Policy Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Conftest
- Open Policy Agent
- Rego
- GitHub Actions
- AWS Terraform Provider resources

## Sources Consulted
- Conftest usage documentation: https://www.conftest.dev/
- Conftest options documentation: https://www.conftest.dev/options/
- Conftest output documentation: https://www.conftest.dev/output/
- Conftest sharing policies documentation: https://www.conftest.dev/sharing/
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Open Policy Agent Rego v1 upgrade notes: https://www.openpolicyagent.org/docs/v0-upgrade
- Terraform AWS Provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket.html
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- Updated Rego partial set rules from the older `deny[msg]` / `warn[msg]` syntax to `deny contains msg if` / `warn contains msg if`, with `future.keywords.if` and `future.keywords.contains` imports so the examples work with current Conftest release behavior while using modern Rego syntax.
- Updated the S3 encryption policy example to avoid checking the deprecated `server_side_encryption_configuration` field on `aws_s3_bucket`. It now checks for the standalone `aws_s3_bucket_server_side_encryption_configuration` resource recommended by the AWS provider documentation.
- Clarified that namespaced packages such as `main.security.encryption` require `--all-namespaces` or `--namespace`, and updated the namespaced policy commands to include `--all-namespaces`.
- Changed Linux and GitHub Actions install commands to use `sudo mv conftest /usr/local/bin/`, because `/usr/local/bin` commonly requires elevated permissions.
- Updated the GitHub Actions policy test step to use `set -o pipefail` before piping Conftest JSON output through `tee`, so Conftest policy failures correctly fail the step.

## Review Notes
- Verified representative patched Rego examples by running Conftest 0.68.2 with OPA 1.15.2 against sample Terraform plan JSON.
- Terraform and Conftest commands are accurate for the documented workflow. The S3 encryption example is intentionally simple and works best when bucket names are known in the plan.
