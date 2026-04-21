# Validation Summary: How to Handle Terragrunt Before and After Hooks with OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terragrunt
- OpenTofu
- HCL
- AWS CLI
- Vault CLI
- Helm CLI
- shell hooks and automation

## Sources Consulted
- Terragrunt hooks documentation: https://docs.terragrunt.com/features/units/hooks/
- Terragrunt HCL `terraform`, hook, and `include` block reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt root configuration migration guidance: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- Terragrunt OpenTofu shortcut command reference: https://docs.terragrunt.com/reference/cli/commands/opentofu-shortcuts/
- OpenTofu `show` command reference: https://opentofu.org/docs/cli/commands/show/
- AWS CLI `ssm get-parameter` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html
- AWS CLI `eks update-kubeconfig` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Vault `kv get` command reference: https://developer.hashicorp.com/vault/docs/commands/kv/get
- Helm `repo update` command reference: https://helm.sh/docs/helm/helm_repo_update/

## Issues Found
- The failure Slack notification was implemented as an `after_hook` with `run_on_error = true`, but Terragrunt documents `run_on_error` as making after hooks run even when the OpenTofu/Terraform command fails, not as making the hook failure-only. Changed the failure notification to an `error_hook` with `on_errors = [".*"]`.
- The standalone notification examples used `path_relative_to_include()`, which depends on an include context. Changed those messages to use `get_terragrunt_dir()` so the snippets work without requiring an omitted parent include.
- The root configuration section implied that a root `terragrunt.hcl` automatically applies to child modules. Current Terragrunt guidance recommends an included parent file such as `root.hcl`; child configurations must include it, and deep merge is needed when both parent and child define `terraform` blocks. Updated the prose and example accordingly.
- The root init hook was named and commented as if it ran `tofu init -upgrade`, but it only printed a message before `init`. Renamed the hook and corrected the comment.
- The audit hook used `$$1`, which shell-expands to the process ID followed by `1`, not the Terragrunt/OpenTofu command. Replaced it with Terragrunt's documented `TG_CTX_COMMAND` hook context variable.
- The conditional hook used a conditional `execute` expression and still ran a placeholder command outside production. Changed it to Terragrunt's native hook `if = local.is_prod` attribute so the hook is actually skipped outside production.

## Review Notes
- The remaining AWS, Vault, Helm, and OpenTofu commands use documented commands and flags.
- `tofu show -json` can expose sensitive values from state in plain text, so diagnostic dumps should be protected and cleaned up in real deployments.
- Local `terragrunt`, `tofu`, and `terraform` binaries were not installed in this workspace, so validation was performed against official documentation and by static review rather than local CLI execution.
