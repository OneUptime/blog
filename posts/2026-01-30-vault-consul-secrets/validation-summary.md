# Validation Summary: How to Create Vault Consul Secrets

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault (Consul secrets engine)
- HashiCorp Consul (ACL system, policies, tokens)
- Vault Agent (auto-auth, templates)
- Kubernetes (init containers, sidecars)
- AppRole and Kubernetes auth methods
- Bash scripting / consul-template templating
- HCL (Consul agent config, Vault policies, Vault Agent config)

## Sources Consulted
- Vault Consul Secrets Engine API docs: https://developer.hashicorp.com/vault/api-docs/secret/consul
- Vault Consul Secrets Engine docs: https://developer.hashicorp.com/vault/docs/secrets/consul
- Consul ACL system docs (policies, tokens, `initial_management`, `global-management`)
- Vault CLI reference (`vault secrets enable`, `vault write/read`, `vault lease renew/revoke/lookup`, `vault audit enable`, `vault login -method=kubernetes`)
- Consul CLI reference (`consul acl policy create`, `consul acl token create/list/read`)
- Vault Agent / consul-template documentation (`auto_auth`, `template` blocks, `{{ with secret }}` syntax)

## Issues Found
- **Parameter table contained deprecated `token_type`**: The post listed `token_type` as a valid role configuration option with values `client`/`management`. Per official docs, this parameter was deprecated and removed as of Consul 1.11 — it only applied to the legacy (pre-1.4) ACL system. Replaced the row with `consul_roles` (Consul 1.5+), which is the modern equivalent. Also updated the `policies` row to show `consul_policies` (the current preferred name) with `policies` noted as an alias, since `policies` was officially superseded by `consul_policies`.
- **Kubernetes init container generated two tokens**: The original snippet called `vault read consul/creds/app-service` twice — once with `-field=token` and once with `-field=lease_id`. Each `vault read` of a `creds/` path issues a *new* dynamic credential, so the captured `lease_id` belonged to a different (orphaned) token than the one written to `/consul/token`. This would break renewal (the renewer holds the wrong lease) and leak the first token until its TTL elapsed. Fixed by issuing a single `vault read -format=json` call and extracting both fields from the cached JSON response via jq, with a comment explaining the rationale. Added `apk add --no-cache jq` since the `hashicorp/vault:1.15` Alpine image does not ship with jq.

## Review Notes
- The `policies` parameter still works as an alias for `consul_policies`, so the example `vault write consul/roles/...` commands using `policies=...` remain functional and were left intact for clarity.
- The post uses the `hashicorp/vault:1.15` image tag, which is a real published tag — fine for the current write-up but readers may want to pin to a newer 1.x image as releases progress.
- The Consul agent HCL uses the assignment-style `acl = { ... }` block form. This is valid HCL2 syntax and is accepted by Consul, though the more conventional Consul style is the block-style `acl { ... }` without `=`. Functionally equivalent — not changed.
- `vault read -field=lease_id` does work because the Vault CLI's `-field` flag looks up top-level response fields as well as nested `data` fields. So the original syntax would have produced *valid* output — the bug was issuing two API calls, not the field extraction itself.
- The sample CLI output for `vault read consul/creds/app-read` shows an `accessor` field; the API docs sample omits `accessor` from `data`, but Vault's Consul engine does populate it on the actual response, so the post is correct.
- The Vault Agent template uses consul-template `{{ with secret ... }}{{ .Data.token }}{{ end }}` syntax, which is correct for Vault dynamic secrets.
- Mermaid diagrams (`sequenceDiagram`, `flowchart LR`, `stateDiagram-v2`) all use valid Mermaid syntax.
