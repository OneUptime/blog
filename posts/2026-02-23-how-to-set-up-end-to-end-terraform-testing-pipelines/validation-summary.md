# Validation Summary: How to Set Up End-to-End Terraform Testing Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and native test framework
- GitHub Actions workflows
- TFLint
- Trivy
- AWS GitHub Actions OIDC authentication
- Go
- Terratest

## Sources Consulted
- Terraform `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test file syntax: https://developer.hashicorp.com/terraform/language/tests
- Terraform `validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- TFLint official README and CLI usage: https://github.com/terraform-linters/tflint
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- AWS configure-aws-credentials action README: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions OIDC for AWS documentation: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- actions/setup-go README: https://github.com/actions/setup-go
- Go release history and support policy: https://go.dev/doc/devel/release
- Terratest package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest

## Issues Found
- The Terraform native test example used `plan.resource_changes`, which is not a documented assertion reference in `.tftest.hcl` files. Replaced it with assertions against named resource values, matching Terraform's documented assertion model.
- The `output.vpc_id != null` plan-time assertion could evaluate against an unknown planned value rather than a concrete output value. Replaced it with `can(tostring(output.vpc_id))` to validate that the output is addressable as a string in a plan-only test.
- The contract test command used `terraform test -filter="tests/contract*.tftest.hcl"`. Terraform documents `-filter` as a test file filter, not a shell glob. Changed the shell loop to expand matching files and pass each file path to `terraform test -filter`.
- The AWS credentials steps used `role-to-arn`, which is not the correct input for `aws-actions/configure-aws-credentials`. Changed both instances to `role-to-assume`.
- The AWS role-assumption jobs did not grant `id-token: write`, which is required for GitHub OIDC-based AWS role assumption. Added `permissions` blocks with `contents: read` and `id-token: write`.
- The examples pinned Terraform 1.7.0 and Go 1.21, which are outdated for a 2026 post. Updated the Terraform examples to 1.15.0 and the Go setup example to Go 1.26, based on current official release documentation.

## Review Notes
- The local environment did not have `terraform` or `tflint` installed, so command validation was performed against official documentation rather than local CLI help output.
- The Trivy action example uses `aquasecurity/trivy-action@master`, which is supported in the upstream README, but pinning actions to immutable commit SHAs is preferable for production CI security.
