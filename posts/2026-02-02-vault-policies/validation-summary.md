# Validation Summary: How to Configure Vault Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- HCL (HashiCorp Configuration Language)
- Vault CLI (`vault policy`, `vault token`, `vault audit`, `vault write`, etc.)
- Vault KV v2 secrets engine
- Vault PKI secrets engine
- Vault database secrets engine
- Vault Identity (entities, groups, templating)
- Vault Enterprise control groups
- AppRole authentication
- Kubernetes authentication
- GitHub Actions (CI/CD pipeline example)

## Sources Consulted
- HashiCorp Vault Policies concepts: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault Commands (CLI): https://developer.hashicorp.com/vault/docs/commands
- `vault policy fmt` command reference: https://developer.hashicorp.com/vault/docs/commands/policy/fmt
- `vault policy write` command reference: https://developer.hashicorp.com/vault/docs/commands/policy/write
- `vault token revoke` command reference: https://developer.hashicorp.com/vault/docs/commands/token/revoke
- Vault audit devices documentation: https://developer.hashicorp.com/vault/docs/audit
- Vault Enterprise control groups: https://developer.hashicorp.com/vault/docs/enterprise/control-groups
- Vault identity templating: https://developer.hashicorp.com/vault/docs/concepts/policies#templated-policies
- GitHub Actions registry (checked for `hashicorp/setup-vault@v2`)

## Issues Found

1. **Glob pattern semantics reversed (critical).** The "Glob Patterns" section described `*` as matching a single path segment and `+` as matching one or more segments. This is the opposite of how Vault actually evaluates them. Per official docs, `*` matches any number of characters but is only allowed as the last character of a path; `+` matches any number of characters within a single path segment and may appear anywhere in the path. Updated the comments and example matches to reflect correct behavior (e.g., `secret/data/myapp/*` now correctly states it matches nested paths, and `secret/data/myapp/+` does not).

2. **Built-in policies modification claim incorrect.** The post claimed both `default` and `root` policies "cannot be modified or deleted." Per official docs, the `default` policy can be modified (Vault will not overwrite changes on upgrade), while `root` cannot be modified. Rewrote the bullet list to distinguish the two.

3. **Nonexistent `vault policy fmt -check` flag.** The "Policy Syntax Validation" code block and the CI/CD example used `vault policy fmt -check`. `vault policy fmt` has no `-check` flag per official command reference; it only formats files in place and inherits the standard global flags. Removed the `-check` flag from both occurrences and updated the comment to clarify what `vault policy fmt` actually does.

4. **Nonexistent GitHub Action `hashicorp/setup-vault@v2`.** The CI/CD YAML example referenced this action, which does not exist on GitHub (the HashiCorp org publishes `vault-action` for retrieving secrets, but not a Vault CLI setup action). Replaced with a manual install step using the official HashiCorp APT repository, which is the documented installation method on Ubuntu runners.

## Review Notes

- The `auth/token/create/root` deny path in the Admin Policy example is somewhat misleading because root tokens are not actually generated through the `auth/token/create/<role>` endpoint — they are generated via `sys/generate-root/*` using the unseal key shards. The example would only meaningfully deny token creation if a token role literally named "root" existed. Left as-is because it is syntactically valid HCL and the intent is illustrative; a future revision could deny `sys/generate-root/*` instead.
- The service mesh example uses `identity.entity.aliases.auth_kubernetes_.metadata.service_account_name` with a trailing underscore that appears to be a placeholder for the Kubernetes auth mount accessor (e.g., `auth_kubernetes_a1b2c3d4`). Readers must replace this with their actual accessor ID, but the templating shape is otherwise correct.
- Control groups (`control_group = {...}`) are a HashiCorp Vault Enterprise feature, which is not called out in the Break-Glass Emergency Access section. The syntax shown matches the Enterprise documentation, but readers on open-source Vault will not be able to use it.
- `min_wrapping_ttl` / `max_wrapping_ttl` parameters are correctly named and valid in policy syntax.
- `vault token revoke -mode=path auth/approle/login` is correct — `-mode=path` takes an auth path prefix per the CLI reference.
- `vault audit enable file file_path=... log_raw=true` uses valid options for the file audit device.
