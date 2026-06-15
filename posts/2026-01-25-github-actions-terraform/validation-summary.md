# Validation Summary: How to Run Terraform with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform S3 backend
- GitHub Actions workflow syntax
- GitHub Actions OIDC authentication for AWS
- AWS IAM role authentication via `aws-actions/configure-aws-credentials`
- Checkov
- tfsec
- GitHub code scanning SARIF uploads
- Infracost

## Sources Consulted
- HashiCorp Terraform CLI `plan` documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- `hashicorp/setup-terraform` documentation: https://github.com/hashicorp/setup-terraform
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions OIDC with AWS documentation: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- `aws-actions/configure-aws-credentials` documentation: https://github.com/aws-actions/configure-aws-credentials
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- `github/codeql-action/upload-sarif` action definition: https://github.com/github/codeql-action/blob/main/upload-sarif/action.yml
- Checkov GitHub Action documentation: https://github.com/bridgecrewio/checkov-action
- tfsec GitHub Action documentation: https://github.com/aquasecurity/tfsec-action
- Infracost GitHub Actions documentation: https://github.com/infracost/actions

## Issues Found
- The examples pinned Terraform `1.7.0`, which is old and conflicts with the current S3 backend locking recommendation. Updated Terraform version examples to `1.15.6`, the current stable release listed by HashiCorp releases at review time.
- The S3 backend example used `dynamodb_table` for state locking. HashiCorp now marks DynamoDB-based S3 backend locking as deprecated and recommends `use_lockfile = true`; updated the backend snippet accordingly.
- The Markdown fence delimiters around the PR comment and S3 backend examples were mismatched. Fixed the closing delimiters so the nested code fences render correctly.
- The directory-based AWS OIDC workflow omitted `id-token: write`, which is required for OIDC role assumption. Added the job permissions block.
- The security scanning job uploaded SARIF without granting `security-events: write`. Added `contents: read`, `security-events: write`, and `actions: read` permissions for compatibility with GitHub's SARIF upload action.
- The tfsec action was pinned to `aquasecurity/tfsec-action@v1.0.0` while the action repository lists `v1.0.3` as the latest release. Updated the action version.
- The drift detection step treated Terraform plan errors as "no drift" because exit code `1` fell into the same branch as exit code `0`. Updated the script to fail on exit code `1` while still creating an issue only for exit code `2`.
- The approval workflow used `terraform plan -detailed-exitcode` inside a default GitHub Actions shell script and attempted to write `$?` after the command. Because GitHub Actions bash steps use fail-fast behavior, exit code `2` could stop the script before writing the output. Added `set +e`, captured the exit code explicitly, wrote it to `$GITHUB_OUTPUT`, and then exited with the captured code.
- The secrets section implied that reading from Secrets Manager or Parameter Store fully avoids secret handling concerns. Clarified that Terraform state still needs encryption and access control because secret values can be stored in state.

## Review Notes
- `infracost/actions/setup@v3` remains documented, but Infracost now recommends its newer `diff` and `scan` actions for new GitHub Actions integrations. The existing snippet is still usable, so it was not restructured.
- Applying saved Terraform plan files across separate jobs requires the same configuration, provider selections, and compatible Terraform version during plan and apply. The post's artifact workflow follows the right basic pattern.
