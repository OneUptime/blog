# Validation Summary: How to Use OpenTofu with Terratest for Integration Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu HCL configuration
- Terratest Go modules (`terraform`, `aws`, `random`)
- Go testing
- AWS VPC resources
- GitHub Actions

## Sources Consulted
- Terratest Quick Start documentation: https://terratest.gruntwork.io/docs/getting-started/quick-start/
- Terratest `terraform` package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest `aws` package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/aws
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `refresh` command documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu v1.11.6 release: https://github.com/opentofu/opentofu/releases/tag/v1.11.6
- `opentofu/setup-opentofu` GitHub Action README: https://github.com/opentofu/setup-opentofu
- `actions/checkout` GitHub Action README: https://github.com/actions/checkout
- `actions/setup-go` GitHub Action README: https://github.com/actions/setup-go
- `actions/upload-artifact` deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The post promised Terratest integration testing but contained no Terratest, Go test, or `go test` workflow. Replaced the generic OpenTofu deployment walkthrough with a Terratest example that sets `TerraformBinary: "tofu"`, runs `terraform.InitAndApply`, validates the created VPC through Terratest's AWS helper, and cleans up with `terraform.Destroy`.
- The original OpenTofu snippet used a production-style S3 backend key and manual `tofu plan`/`tofu apply` flow, which is not an appropriate integration-test example. Replaced it with a small isolated AWS VPC module suitable for Terratest-managed apply/destroy.
- The GitHub Actions workflow used `actions/upload-artifact@v3` and `actions/download-artifact@v3`, which are no longer usable on GitHub.com after the January 30, 2025 artifact action deprecation. Replaced the workflow with a current Terratest job using `actions/checkout@v6`, `actions/setup-go@v6`, `opentofu/setup-opentofu@v2`, and `aws-actions/configure-aws-credentials@v6.1.0`.
- The original workflow pinned OpenTofu `1.7.0`, while the current OpenTofu release is `1.11.6`. Updated the CI example to install `1.11.6` and raised the example module's minimum OpenTofu version from `>= 1.6.0` to `>= 1.9.0`.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated because it updates state without a review step. Replaced it with `tofu plan -refresh-only`.
- The post used `tofu show tfplan`, which current OpenTofu docs describe as legacy syntax. The corrected Terratest workflow no longer requires saved plan inspection.

## Review Notes
- The local workspace did not have `tofu` or `go` installed, so command validation was performed against official OpenTofu, Terratest, GitHub Actions, and AWS provider documentation rather than local CLI execution.
- The corrected example deploys real AWS infrastructure. It should be run with a restricted test role/account and a timeout so interrupted tests can be cleaned up safely.
