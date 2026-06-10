# Validation Summary: How to Build Vault Batch Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (batch tokens, service tokens, token roles)
- Vault CLI (`vault token create`, `vault write auth/token/roles/...`)
- Vault HTTP API (`/v1/auth/token/create`)
- Python `hvac` client library
- Go `github.com/hashicorp/vault/api` client library
- Vault Agent (auto_auth, Kubernetes auth method, templates)
- Kubernetes (ConfigMap, Job, vault-agent sidecar pattern)
- Mermaid sequence diagrams

## Sources Consulted
- HashiCorp Vault — Tokens concept docs: https://developer.hashicorp.com/vault/docs/concepts/tokens
- HashiCorp Vault — Vault Agent template docs: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- hvac documentation — Token auth method: https://python-hvac.org/en/stable/usage/auth_methods/token.html
- hvac source code — `hvac/api/auth_methods/token.py` (verified `create()` signature)
- HashiCorp Vault Go API — `TokenCreateRequest` struct and `Auth().Token().CreateWithRole()` method

## Issues Found

1. **Incorrect hvac parameter name in Python example.** The post used `token_type='batch'` when calling `client.auth.token.create()`. The hvac library's `create()` method parameter is named `type`, not `token_type`. Calling with `token_type='batch'` would have been silently ignored (or raised a TypeError depending on hvac version), producing a service token instead of a batch token. Fixed to `type='batch'`.

2. **Outdated token prefix examples.** The "Token Size" section used the legacy `s.` and `b.` prefix format. HashiCorp Vault changed token prefixes in Vault 1.10 to `hvs.` (service) and `hvb.` (batch). Updated the examples to use the current prefix format, which is what readers will actually encounter on modern Vault (≥1.10).

3. **Invalid Vault Agent `template_config` options.** The Kubernetes example included a `template_config` block with `generate_token = true` and `token_type = "batch"`. Neither of these is a valid field in Vault Agent's `template_config` (valid options are `exit_on_retry_failure`, `static_secret_render_interval`, `max_connections_per_host`, `lease_renewal_threshold`). The correct way to make Vault Agent issue batch tokens through the Kubernetes auth method is to set `token_type=batch` on the Vault auth role itself. Replaced the invalid block with a commented-out `vault write auth/kubernetes/role/...` example showing the right approach.

4. **Misleading "Root/orphan capable" table row.** The original row stated batch tokens could be neither root nor orphan, which conflates two distinct things. Per Vault's official tokens documentation, batch tokens cannot be root tokens, but they *can* be orphan (and orphan batch tokens have a specific advantage: they can be used across performance replication clusters). Split the row into two: "Can be root token" (No / Yes) and "Can be orphan" (Yes / Yes).

## Review Notes
- The Go example using `client.Auth().Token().CreateWithRole(&vault.TokenCreateRequest{...}, role)` is correct against the current `github.com/hashicorp/vault/api` package. The `Metadata` field on `TokenCreateRequest` marshals to JSON key `meta`, which matches the Vault API.
- The performance numbers ("10x faster token creation", "50% reduction in Vault storage operations") are rough order-of-magnitude figures and depend heavily on workload and storage backend. They're directionally accurate (batch tokens skip a storage write/read round-trip) but readers should treat them as illustrative rather than benchmarked guarantees.
- Batch token caching (as shown in the Go example) is a reasonable optimization for very high-throughput services, but be aware that since batch tokens cannot be renewed, the 5-minute expiration buffer in the cache must always be shorter than the token's TTL. For very short TTLs (<5 minutes), the buffer should be adjusted accordingly.
- The CLI `-metadata=key=value` flag can be specified multiple times, as the post correctly shows. This is accurate against current Vault CLI behavior.
- The HTTP API endpoint `/v1/auth/token/create` is correct. Note that `/v1/auth/token/create-orphan` exists as a separate endpoint for explicitly creating orphan tokens, but `no_parent` in the request body to the regular endpoint also works.
- All Mermaid syntax in the sequence diagram is valid.
