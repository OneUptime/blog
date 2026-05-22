# Validation Summary: How to Use OpenTofu with Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- Terraform-compatible HCL
- AWS S3 remote state
- AWS provider configuration
- Amazon EKS
- GitHub Actions

## Sources Consulted
- Terragrunt HCL attributes: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt HCL blocks: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt CLI run command: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt OpenTofu shortcuts: https://docs.terragrunt.com/reference/cli/commands/opentofu-shortcuts/
- OpenTofu installation documentation: https://opentofu.org/docs/intro/install/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu migration documentation: https://opentofu.org/docs/intro/migration/
- OpenTofu setup GitHub Action: https://github.com/opentofu/setup-opentofu
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html

## Issues Found
- Terragrunt no longer defaults to `terraform` in current documentation. Updated the post to say current Terragrunt releases default to `tofu`, while `terraform_binary = "tofu"` can still be set explicitly.
- The environment variable `TERRAGRUNT_TFPATH` is outdated under the current Terragrunt CLI redesign. Replaced it with `TG_TF_PATH`.
- The post suggested `terragrunt --version` would show both Terragrunt and OpenTofu versions. Updated the verification commands to run `terragrunt --version` and `tofu version` separately.
- The examples used deprecated `terragrunt run-all` syntax. Replaced it with the current `terragrunt run --all` syntax.
- The CI examples used deprecated `--terragrunt-non-interactive`. Replaced it with `--non-interactive`.
- The GitHub Actions example used `opentofu/setup-opentofu@v1`, while the current action documentation shows `@v2`. Updated the action version.
- The pinned Terragrunt and OpenTofu example versions were stale. Updated the examples to Terragrunt `1.0.1` and OpenTofu `1.12.0`.
- The EKS example used Kubernetes `1.28`, which is no longer a current standard-support example. Updated it to `1.33`, matching the current EKS lifecycle documentation.
- The migration section implied the switch is literally a single configuration change. Updated the wording and steps to include backing up state/code and following OpenTofu's migration guidance for the source Terraform version.

## Review Notes
Terragrunt and OpenTofu binaries were not installed in the local workspace, so CLI execution was not performed locally. The review was completed against official documentation and the snippets were checked for current syntax and configuration names.
