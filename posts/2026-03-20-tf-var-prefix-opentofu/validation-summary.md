# Validation Summary: How to Use the TF_VAR_ Prefix with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu input variables
- TF_VAR_ environment variables
- HCL variable declarations
- GitHub Actions
- AWS Secrets Manager
- jq

## Sources Consulted
- OpenTofu input variables and variable precedence: https://opentofu.org/docs/language/values/variables/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu plan command and saved plan file behavior: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command and saved plan mode: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu console command: https://opentofu.org/docs/cli/commands/console/
- OpenTofu type constraints and primitive conversion: https://opentofu.org/docs/language/expressions/type-constraints/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions secrets usage: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Actions OIDC with AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- actions/checkout README and releases: https://github.com/actions/checkout
- aws-actions/configure-aws-credentials README: https://github.com/aws-actions/configure-aws-credentials
- jq manual for shell escaping with `@sh`: https://jqlang.org/manual/dev/

## Issues Found
- The variable precedence order was incorrect. The post said `TF_VAR_` values override tfvars files, but OpenTofu treats environment variables as a fallback and later-loaded tfvars files and command-line options override them. Updated the precedence list and example comment.
- The `-var` and `-var-file` precedence description was too rigid. OpenTofu processes command-line `-var` and `-var-file` options in the order provided, so updated the list to reflect that.
- The GitHub Actions example used older action major versions. Updated `actions/checkout` from `v4` to `v6` and `aws-actions/configure-aws-credentials` from `v4` to `v6.1.0`.
- The GitHub Actions example assumed an AWS role without granting the job `id-token: write`, which is required for the recommended OIDC flow. Added job permissions for `id-token: write` and `contents: read`.
- The commented AWS Secrets Manager export pipeline emitted raw values into shell `export` commands. Updated the jq expression to use `@sh` and quoted the command substitution so values with spaces or shell metacharacters are escaped correctly.
- The debugging plan command used `-var=environment=test`, which would override `TF_VAR_environment` instead of verifying it. Removed the overriding `-var` flag.
- The secrets best-practice wording was too absolute about environment variables not appearing in shell history. Updated it to focus on avoiding secret values directly in the `tofu` command line.
- The sensitive variable best-practice bullet overstated what `sensitive = true` protects. Updated it to say values are redacted from plan/apply output, while state and saved plan files can still contain sensitive data.
- The naming guidance described environment variables as universally case-sensitive. Updated it to match OpenTofu's OS-specific caveat: exact case matters on case-sensitive operating systems.

## Review Notes
- The main `TF_VAR_` usage, complex value examples, variable declarations, GitHub Actions `env` usage, and OpenTofu CLI commands are valid.
- `tofu` is not installed in this workspace, so validation was performed against official OpenTofu and GitHub documentation rather than local CLI execution.
