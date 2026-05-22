# Validation Summary: How to Use the terraform test Command

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform test framework
- Terraform test files (`.tftest.hcl` and `.tftest.json`)
- Terraform Cloud / HCP Terraform
- GitHub Actions CI

## Sources Consulted
- HashiCorp Terraform `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- HashiCorp Terraform v1.6 `test` command reference: https://developer.hashicorp.com/terraform/cli/v1.6.x/commands/test
- HashiCorp Terraform test file documentation: https://developer.hashicorp.com/terraform/language/files/tests
- HashiCorp Terraform test language documentation: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp Terraform machine-readable UI reference: https://developer.hashicorp.com/terraform/internals/machine-readable-ui

## Issues Found
- The post said Terraform test files must use only the `.tftest.hcl` extension. HashiCorp documents both `.tftest.hcl` and `.tftest.json`, so the post now mentions both supported extensions.
- The JSON output example used outdated/non-documented event names and fields such as `test_summary`, `test_file_status`, and top-level `test_file` strings. It now uses the documented `test_abstract`, `test_file`, and `test_run` event shapes.
- The execution-order section claimed test files run alphabetically. I could not verify that as a documented guarantee, so the section now focuses on documented isolated state behavior and default sequential execution of run blocks.
- The timeout section documented `terraform test -timeout=30m`, but the official `terraform test` command options do not include `-timeout`. The section now recommends CI-level or shell-level timeouts for an overall suite limit.
- The Terraform Cloud section said tests can use the Cloud backend for state and do not use remote execution. HashiCorp documents in-memory test state by default and remote execution through `-cloud-run`, so the section now reflects that behavior.

## Review Notes
- Terraform was not installed in the local workspace, so CLI behavior was validated against HashiCorp's current and v1.6 official documentation rather than local `terraform test -help` output.
- The post remains focused on Terraform 1.6+ stable testing behavior. Current Terraform documentation includes newer options such as `-junit-xml` and `-parallelism`, but the post does not need to cover every available flag to remain technically correct.
