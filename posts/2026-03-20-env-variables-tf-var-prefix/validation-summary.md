# Validation Summary: How to Set Variables Using Environment Variables with TF_VAR_ Prefix

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu input variables
- `TF_VAR_` environment variables
- GitHub Actions
- AWS Secrets Manager
- HashiCorp Vault

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Environment Variables: https://opentofu.org/docs/v1.9/cli/config/environment-variables/
- OpenTofu Type Constraints: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- AWS Secrets Manager CLI retrieval docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_cli.html
- Vault CLI `read` command: https://developer.hashicorp.com/vault/docs/commands/read
- Vault CLI `kv get` command: https://developer.hashicorp.com/vault/docs/commands/kv/get

## Issues Found
- The variable precedence section was incorrect. I updated it to match OpenTofu documentation: `TF_VAR_` environment variables are a fallback source and have lower precedence than `.tfvars` files and command-line `-var`/`-var-file` options.
- The complex-type section implied that exporting the environment values alone was sufficient. I added matching `variable` declarations with complex type constraints so the examples work as described.
- The `sensitive = true` comment was incomplete. I clarified that OpenTofu redacts sensitive values in `plan`/`apply` output but still stores them in state.
- The GitHub Actions example used `opentofu/setup-opentofu@v1`. I updated it to `@v2` to match the current official usage shown in the action's README.

## Review Notes
- `TF_VAR_` values set for undeclared variables do not raise an error or warning in OpenTofu, so matching variable declarations matter in tutorial examples.
- OpenTofu documentation recommends variable definition files for complex values because they are easier to read and less error-prone than shell-escaped environment variables.
