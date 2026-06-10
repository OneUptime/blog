# Validation Summary: How to Implement Vault Service Tokens

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault (service tokens, batch tokens, accessors, orphan tokens, periodic tokens, token roles)
- Vault CLI (`vault token create`, `vault token lookup`, `vault token revoke`, `vault list`, `vault write`)
- Vault HTTP API (`/auth/token/renew-self`, `/auth/token/revoke-self`, `/auth/token/create`, `/auth/token/create-orphan`, `/auth/token/roles/*`)
- hvac (Python Vault client library)
- AppRole authentication
- KV v2 secrets engine
- Bash scripting / jq
- Mermaid diagrams

## Sources Consulted
- HashiCorp Vault Tokens overview: https://developer.hashicorp.com/vault/docs/concepts/tokens
- Service vs Batch Tokens: https://developer.hashicorp.com/vault/docs/concepts/tokens#service-vs.-batch-tokens
- Token Auth API: https://developer.hashicorp.com/vault/api-docs/auth/token
- Periodic Tokens: https://developer.hashicorp.com/vault/docs/concepts/tokens#periodic-service-tokens
- Token Roles (create/update): https://developer.hashicorp.com/vault/api-docs/auth/token#create-update-token-role
- Vault CLI `token create` flags: https://developer.hashicorp.com/vault/docs/commands/token/create
- hvac Token auth method docs: https://hvac.readthedocs.io/en/stable/usage/auth_methods/token.html
- hvac Token source: https://github.com/hvac/hvac/blob/main/hvac/api/auth_methods/token.py
- hvac KV v2 docs: https://hvac.readthedocs.io/en/stable/usage/secrets_engines/kv_v2.html
- hvac AppRole docs: https://hvac.readthedocs.io/en/stable/usage/auth_methods/approle.html

## Issues Found
- **Invalid hvac `create()` keyword `orphan=True`** in the "Orphan Token in Application Code" example. The hvac `Token.create()` method does not accept an `orphan` parameter. The correct options are either `no_parent=True` on `create()` (root/sudo only) or the dedicated `create_orphan()` method which calls the `/auth/token/create-orphan` endpoint. Changed the example to use `client.auth.token.create_orphan(...)` (removing the invalid `orphan=True` kwarg) and added a brief comment explaining the sudo capability requirement, matching the surrounding tutorial style.

## Review Notes
- The service vs batch token comparison table is accurate.
- CLI flags `-policy`, `-ttl`, `-display-name`, `-orphan`, `-period`, and `-format=json` are all valid `vault` CLI options.
- Token role fields `allowed_policies`, `disallowed_policies`, `orphan`, `renewable`, `token_period`, and `token_explicit_max_ttl` are all current (non-deprecated) field names for `auth/token/roles/<name>`.
- hvac methods `lookup_accessor`, `revoke_accessor`, `lookup_self`, `renew_self`, `revoke_self`, `approle.login`, and `secrets.kv.v2.read_secret_version` are all called with correct signatures.
- The periodic token example uses `period='3600'` (string seconds), which Vault accepts. Note that the create-response `auth` block does not typically include a `period` key directly, so `token_data.get('period', 'N/A')` will usually print `N/A`; the code is defensive (uses `.get`) so it does not error. Left as-is since it is not technically incorrect.
- In recent hvac releases, `kv.v2.read_secret_version` accepts an optional `raise_on_deleted_version` argument that emits a DeprecationWarning if omitted; the call still works without it. Not changed.
- Token accessor placeholder strings like `aGvs.abc123...` are illustrative; real Vault accessors are typically opaque IDs without an `hvs.`-style prefix. Left as-is since the values are clearly placeholders.
