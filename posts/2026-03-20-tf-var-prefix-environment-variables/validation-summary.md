# Validation Summary: How to Set Variables Using Environment Variables with TF_VAR_ Prefix (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu input variables
- `TF_VAR_` environment variables
- Bash environment variables
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- OpenTofu Environment Variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu Sensitive Data in State documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/

## Issues Found
- The post claimed any `TF_VAR_` environment variable is automatically read as a variable value. Updated this to clarify that OpenTofu looks for `TF_VAR_` values matching declared root module input variables.
- The post overstated the security of `TF_VAR_`, claiming secrets never appear in command history, process listings, or log files. Updated the language to say `TF_VAR_` avoids putting values in OpenTofu command-line arguments, but environment variables and OpenTofu state/log output still require care.
- The sensitive-value examples embedded a literal secret in `export` and inline environment assignment commands, which can still end up in shell history. Updated the examples to populate `TF_VAR_database_password` from an existing secret source such as `$DB_PASSWORD`.
- The variable precedence list incorrectly separated `-var` and `-var-file` into fixed priority levels and omitted `terraform.tfvars.json` / `*.auto.tfvars.json`. Updated the list to match OpenTofu documentation: defaults, environment variables, `terraform.tfvars`, `terraform.tfvars.json`, auto tfvars files in lexical order, and then `-var` / `-var-file` options in the order provided.
- The `env | grep ^TF_VAR_` example implied secret values would appear as `[hidden]`. Updated it to list only variable names with `cut` so the example does not suggest that `env` automatically redacts secrets.

## Review Notes
The remaining examples are technically valid for Unix-style shells and current OpenTofu CLI behavior. OpenTofu documentation recommends variable definition files for complex typed values when quoting becomes difficult, but the JSON-compatible examples in the post are valid when the corresponding variables have complex type constraints.
