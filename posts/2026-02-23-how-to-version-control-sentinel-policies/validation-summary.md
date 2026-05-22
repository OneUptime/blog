# Validation Summary: How to Version Control Sentinel Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- HashiCorp Sentinel
- HCP Terraform / Terraform Enterprise policy sets
- Sentinel CLI
- Git and Git tags
- GitHub Actions
- GitLab CI
- GitHub CODEOWNERS

## Sources Consulted
- HashiCorp Sentinel CLI configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Sentinel `test` command reference: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel `fmt` command reference: https://developer.hashicorp.com/sentinel/docs/commands/fmt
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HCP Terraform Sentinel VCS policy set documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HCP Terraform policy set connection documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/configure
- HashiCorp Sentinel releases: https://releases.hashicorp.com/sentinel/

## Issues Found
- The repository layout placed tests in a root-level `test/` directory while the policies were nested under `policies/security`, `policies/compliance`, and `policies/cost`. Sentinel test cases are expected under `test/<policy>` relative to the policy file being tested, so the structure was updated to place test directories beside each policy group.
- The CI examples used `sentinel test -verbose` without paths, which does not discover nested policy files. Updated the GitHub Actions, GitLab CI, and monorepo matrix examples to pass the nested `.sentinel` policy files found under `policies/`.
- The CI examples used `sentinel fmt -check sentinel.hcl` and `sentinel fmt -check .`. The `sentinel fmt` command formats Sentinel policy source files, not HCL configuration files or directories. Updated those steps to check `.sentinel` files under `policies` and `modules`.
- The GitLab CI example referenced `hashicorp/sentinel:latest`, which was not verified in the official HashiCorp documentation consulted. Replaced it with an `ubuntu:latest` job that downloads Sentinel 0.24.1 from HashiCorp releases, matching the GitHub Actions example.
- The `sentinel.hcl` example used the deprecated `module` block form. Updated it to the current `import "module" "<name>"` form, which is accepted by Sentinel 0.24.1 without deprecation warnings.

## Review Notes
- Sentinel 0.24.1 is available from HashiCorp releases, but the current Sentinel documentation lists newer release lines. Pinning a version is still appropriate for reproducible CI; future maintenance should periodically update the pinned version after testing.
