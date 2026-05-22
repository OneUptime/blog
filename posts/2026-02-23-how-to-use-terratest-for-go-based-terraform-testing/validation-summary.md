# Validation Summary: How to Use Terratest for Go-Based Terraform Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terratest
- Go
- Go test
- GitHub Actions
- AWS credentials for CI

## Sources Consulted
- Terratest Terraform module documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest HTTP helper documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/http-helper
- Terratest random module documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/random
- Terraform test framework documentation: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- AWS configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials
- Terratest go.mod: https://github.com/gruntwork-io/terratest/blob/main/go.mod
- Go command test flag documentation: https://pkg.go.dev/cmd/go
- Go testing package documentation: https://pkg.go.dev/testing

## Issues Found
- The retry example used `http_helper.HttpGetWithRetry`, which Terratest marks as deprecated. Updated the example to `http_helper.HTTPGetWithRetryContext` and added `context.Background()` to match the current API.
- The `terraform.Options` example included a commented `SkipDestroy` field. That field is not part of the current Terratest `terraform.Options` struct, so it was removed.
- The GitHub Actions workflow used `hashicorp/setup-terraform@v3`. Updated it to `hashicorp/setup-terraform@v4`, matching the current official action documentation.
- The GitHub Actions workflow used Go 1.21 even though the current Terratest module declares `go 1.26`. Updated `actions/setup-go` to install Go 1.26.
- The AWS credentials step supplied `role-to-assume` without the OIDC `id-token: write` permission. Added job permissions and updated `aws-actions/configure-aws-credentials` to the current major version.

## Review Notes
The Go examples are illustrative and assume the surrounding imports, Terraform variables, Terraform outputs, provider credentials, and cloud resources exist. The `go test` flags, `t.Parallel()` usage, Terraform native test description, Terratest output helpers, plan struct access, and cleanup pattern are technically accurate.
