# Validation Summary: How to Handle Secrets in OpenTofu Configurations Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Secrets Manager
- AWS RDS (`aws_db_instance`)
- HashiCorp Vault
- GitHub Actions
- `git-secrets`

## Sources Consulted
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu sensitive data in state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu ephemerality documentation: https://opentofu.org/docs/language/ephemerality/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- AWS provider `aws_secretsmanager_secret_version` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- AWS provider `aws_db_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Vault provider `vault_kv_secret_v2` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/d/kv_secret_v2.html.md
- Vault provider docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/index.html.markdown
- `git-secrets` official repository and README: https://github.com/awslabs/git-secrets
- GitHub Actions secrets documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets?tool=cli

## Issues Found
- The description and introduction overstated the protection provided by `sensitive = true`. OpenTofu documents that `sensitive` redacts routine CLI output but still stores values in state, so the post was updated to reflect that.
- The environment variable section said secrets "never touch disk." That was too absolute and not what the OpenTofu docs guarantee. The wording was narrowed to the accurate claim that environment variables avoid hardcoding secrets in configuration files.
- The AWS Secrets Manager section said secrets were pulled "at apply time" and implied that kept them out of state. OpenTofu and provider behavior mean data source values are available during plan and, when passed into ordinary resource arguments, can still be written to state. The prose was corrected.
- The `lifecycle { ignore_changes = [password] }` block was technically incorrect. `ignore_changes` does not mark a value as sensitive or prevent it from being stored in state; it only suppresses diffs for that attribute. The block was removed.
- Several `aws_db_instance` snippets were incomplete and would not work as shown because required RDS arguments such as `allocated_storage`, `engine`, and `instance_class` were missing. Those examples were updated to minimally valid resource definitions.
- The Vault section originally omitted an important security caveat. The Vault provider documentation explicitly warns that secrets read through Vault data sources are persisted to state and may be included in plan files, so that note was added.
- The conclusion implied that using env vars or secret-manager data sources was enough to keep secrets out of state. It was updated to say state must still be treated as sensitive, and to mention OpenTofu ephemerality or provider write-only arguments as the way to avoid persisting a secret where supported.
- The `git secrets --install` command comment was tightened to clarify that it installs repository hooks, not the `git-secrets` binary itself.

## Review Notes
- The HCL syntax, `TF_VAR_` usage, GitHub Actions `env:` example, `.tfvars` usage, and `git secrets --install` / `git secrets --register-aws` / `git secrets --scan-history` commands were all consistent with the consulted documentation.
- The post remains valid as a general guide, but readers should understand that most "read a secret and pass it into a resource" patterns reduce exposure in source control more than they eliminate exposure from state.
