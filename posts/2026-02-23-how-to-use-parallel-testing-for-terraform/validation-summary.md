# Validation Summary: How to Use Parallel Testing for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and native Terraform tests
- Terratest
- Go testing package
- GitHub Actions matrix workflows
- AWS GitHub Actions OIDC credential configuration

## Sources Consulted
- Terraform `test` command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test language documentation: https://developer.hashicorp.com/terraform/language/tests
- Go `go test` flags documentation: https://go.dev/cmd/go/
- Terratest Terraform module API documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest quick start documentation: https://terratest.gruntwork.io/docs/getting-started/quick-start/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- AWS `configure-aws-credentials` action documentation: https://github.com/aws-actions/configure-aws-credentials
- HashiCorp `setup-terraform` action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The first Terratest example used an undefined `randomId()` helper. Replaced it with Terratest's documented `random.UniqueId()` helper and added the required import.
- The Go command comment claimed the example ran a specific test, but the command did not use `-run`. Updated the comment to accurately describe `-count=1` as disabling test caching while limiting parallelism.
- The CIDR allocation helper wrapped with `n % 256`, which could eventually duplicate CIDR ranges despite claiming uniqueness. Added an exhaustion guard and returned the incrementing octet directly.
- The GitHub Actions AWS example assumed a role without granting `id-token: write`, which is required for the common GitHub OIDC flow shown by `aws-actions/configure-aws-credentials`. Added workflow permissions for `contents: read` and `id-token: write`.
- The shared dependency example read `SHARED_VPC_ID` in tests but never populated it from the shared fixture. Added `terraform.Output` and `os.Setenv` after creating the shared fixture.
- The native Terraform test section said Terraform test files run sequentially by default and only suggested CI matrices. Updated it to reflect current Terraform behavior: `run` blocks are sequential by default, but independent runs can use `parallel = true` with distinct `state_key` values, and CI matrices can still split files across jobs.

## Review Notes
Local `go` and `terraform` binaries were not installed in the workspace, so CLI verification was performed against official documentation rather than local `--help` output. The examples remain illustrative and depend on module-specific variables, outputs, provider credentials, and fixture structure.
