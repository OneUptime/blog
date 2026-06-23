# Validation Summary: How to Set Up Terraform Pipeline in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Terraform CLI
- Terraform S3 backend state management
- HCP Terraform / Terraform Cloud authentication
- AWS IAM OIDC authentication
- GitHub Actions environments and deployment approvals
- GitHub code scanning SARIF upload
- tfsec
- Checkov
- Terratest

## Sources Consulted
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- hashicorp/setup-terraform README: https://github.com/hashicorp/setup-terraform
- GitHub Docs for OIDC with AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- aws-actions/configure-aws-credentials README: https://github.com/aws-actions/configure-aws-credentials
- GitHub Docs for deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs for uploading SARIF: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- bridgecrewio/checkov-action README: https://github.com/bridgecrewio/checkov-action

## Issues Found
- The Terraform version pin used `1.7.0`, while the current stable Terraform release series is `1.15.x`. Updated both workflow examples to `1.15.6`.
- The S3 backend example used `dynamodb_table`, which HashiCorp now documents as deprecated for S3 backend locking. Replaced it with `use_lockfile = true`.
- The `github-script` examples embedded Markdown triple-backtick fences directly inside JavaScript template literals, which would terminate the template string and produce invalid JavaScript. Escaped the backticks in the PR plan comments and drift issue body.
- The drift detection command piped `terraform plan -detailed-exitcode` through `tee` and then read `$?`, which captures `tee`'s exit status instead of Terraform's. Updated the script to read `${PIPESTATUS[0]}` and preserve Terraform's detailed exit code.
- The standalone Checkov SARIF upload job did not grant `security-events: write`, which GitHub requires for SARIF uploads. Added the required job permissions.

## Review Notes
- The workflow examples are illustrative and still assume that cloud roles, Terraform backend resources, repository variables, and GitHub environment protection rules already exist.
- Some GitHub Actions have newer major versions available in upstream documentation, but the versions shown in the post are not inherently invalid unless a project chooses to standardize on the latest major versions.
