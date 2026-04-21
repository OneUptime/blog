# Validation Summary: How to Configure Terragrunt to Use OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- HCL configuration
- GitHub Actions
- AWS S3 remote state backend
- AWS provider configuration

## Sources Consulted
- Terragrunt HCL attributes reference: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt CLI `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt root configuration migration guide: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- Terragrunt state backend documentation: https://docs.terragrunt.com/features/units/state-backend/
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt install documentation: https://docs.terragrunt.com/getting-started/install/
- Terragrunt GitHub Action README: https://github.com/gruntwork-io/terragrunt-action
- OpenTofu install documentation: https://opentofu.org/docs/intro/install/
- OpenTofu Homebrew install documentation: https://opentofu.org/docs/intro/install/homebrew/
- OpenTofu CLI version command documentation: https://opentofu.org/docs/cli/commands/version/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GitHub releases: https://github.com/opentofu/opentofu/releases

## Issues Found
- The post used the legacy `TERRAGRUNT_TFPATH` environment variable. Updated it to the current `TG_TF_PATH` variable documented by Terragrunt.
- The verification step used `terragrunt --version` and claimed it should show the OpenTofu version. Replaced it with `terragrunt info print`, which reports the configured `terraform_binary`.
- The root shared configuration used `terragrunt.hcl` and bare `find_in_parent_folders()`. Updated the example to use the current recommended `root.hcl` pattern and `find_in_parent_folders("root.hcl")`.
- The command examples used deprecated `run-all`. Updated them to the current `terragrunt run --all ...` form.
- The CI example used the legacy `--terragrunt-non-interactive` flag and `TERRAGRUNT_TFPATH` variable. Updated it to `TG_NON_INTERACTIVE`, `TG_TF_PATH`, and `terragrunt run --all plan`.
- The CI example installed only OpenTofu but then ran `terragrunt`. Replaced it with the official `gruntwork-io/terragrunt-action@v3` installation step for both Terragrunt and OpenTofu.
- The CI example pinned OpenTofu `1.9.0`, which is outdated as of this review. Updated the example to OpenTofu `1.11.6`, the latest release shown by the official OpenTofu GitHub releases page during validation.
- The Terragrunt fallback install link pointed to the product home page. Updated it to the current install documentation URL.

## Review Notes
Terragrunt currently defaults to the `tofu` binary when it is available, but `terraform_binary` and `TG_TF_PATH` remain valid ways to make the selection explicit. The S3 backend example using `dynamodb_table` remains valid; OpenTofu also supports S3 lockfiles in newer versions, but DynamoDB locking is still documented. Local execution was not performed because `tofu` and `terragrunt` are not installed in this workspace; commands and configuration were validated against official documentation.
