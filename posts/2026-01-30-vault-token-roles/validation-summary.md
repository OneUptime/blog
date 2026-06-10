# Validation Summary: How to Create Vault Token Roles

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- HashiCorp Vault (token roles, token auth method)
- Vault CLI (`vault write`, `vault read`, `vault token create`)
- Vault HTTP API (`auth/token/roles/{name}`, `auth/token/create/{role}`)
- hvac (Python Vault client library)
- `github.com/hashicorp/vault/api` (Go Vault client library)
- Mermaid diagrams

## Sources Consulted
- HashiCorp Vault Token Auth Method API docs: https://developer.hashicorp.com/vault/api-docs/auth/token
- HashiCorp Vault Token concepts: https://developer.hashicorp.com/vault/docs/concepts/tokens
- HashiCorp Vault CLI command reference for `vault token create` and `vault write`
- hvac Python library docs: https://hvac.readthedocs.io/ (Client.write, auth.token.create)
- `github.com/hashicorp/vault/api` Go SDK source (TokenCreateRequest, Auth().Token().CreateWithRole)
- Go language spec on unused imports (causes compile-time error)

## Issues Found
1. **Wildcard policy example used the wrong parameter** (line 144). The example was promoting glob-pattern matching but assigned `*-admin` to `disallowed_policies` (literal match) instead of `disallowed_policies_glob`. As written, only a policy literally named `*-admin` would be blocked, defeating the demonstration. Changed `disallowed_policies="*-admin"` to `disallowed_policies_glob="*-admin"` so the example actually performs glob matching as the surrounding comment describes.

2. **Go example had an unused `context` import.** The `context` package was imported but never referenced. Go treats unused imports as a compile-time error (`imported and not used: "context"`), so the example would not build. Removed the `context` import from the import block.

3. **Configuration parameters table listed the wrong default for `token_type`.** The table showed the default as `default`, but the Vault API docs and the sample `vault read` output earlier in the same post both confirm the default is `default-service`. Updated the table entry to `default-service` so it matches both the official API docs and the earlier output snippet.

## Review Notes
- The `vault write auth/token/roles/<name>` endpoint, the parameters used (`allowed_policies`, `disallowed_policies`, `allowed_policies_glob`, `disallowed_policies_glob`, `orphan`, `renewable`, `token_ttl`, `token_max_ttl`, `token_explicit_max_ttl`, `token_period`, `token_type`, `token_no_default_policy`, `token_num_uses`, `token_bound_cidrs`), and the `vault token create -role=<name>` CLI form are all current and accurate.
- The `hvs.` token prefix shown in the CLI output is the post-Vault-1.10 service token format and is correct for modern Vault.
- The hvac call `client.write(path, **kwargs)` still works in current hvac releases but emits a deprecation warning; `client.write_data(path, data=...)` is the newer recommended call. Not corrected because the existing code still functions.
- The hvac call `client.auth.token.create(role_name=..., policies=..., ttl=...)` and response shape `response['auth']` with `client_token`, `accessor`, `lease_duration`, `renewable`, `policies` keys are correct.
- The Go SDK calls `client.Auth().Token().CreateWithRole(req, role)` and `vault.TokenCreateRequest{Policies: ...}` are accurate against the current `github.com/hashicorp/vault/api` package.
- The Python example imports `datetime` and `timedelta` but never uses them. Not a runtime error in Python, so left in place per the "only fix technical errors" instruction.
- The sample `vault read auth/token/roles/<name>` output omits `allowed_policies_glob` and `disallowed_policies_glob` rows that a real Vault would print (as empty arrays). This is a benign simplification rather than an inaccuracy in shown values, so left as-is.
