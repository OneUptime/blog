# Validation Summary: How to Create Vault Response Wrapping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered

- HashiCorp Vault (response wrapping, cubbyhole secrets engine, KV v2 secrets engine)
- Vault CLI (`vault kv`, `vault unwrap`, `vault write`, `vault secrets enable`)
- Vault HTTP API (`sys/wrapping/unwrap`, `sys/wrapping/lookup`, `X-Vault-Wrap-TTL`, `X-Vault-Token`)
- Python `hvac` client library
- Go `github.com/hashicorp/vault/api` client library
- Vault audit log format
- Mermaid (for the sequence diagram)

## Sources Consulted

- HashiCorp Vault Response Wrapping concepts: https://developer.hashicorp.com/vault/docs/concepts/response-wrapping
- Cubbyhole Secrets Engine: https://developer.hashicorp.com/vault/docs/secrets/cubbyhole
- `vault kv get` CLI: https://developer.hashicorp.com/vault/docs/commands/kv/get
- `sys/wrapping/unwrap` API: https://developer.hashicorp.com/vault/api-docs/system/wrapping-unwrap
- `sys/wrapping/lookup` API: https://developer.hashicorp.com/vault/api-docs/system/wrapping-lookup
- Vault Go API package: https://pkg.go.dev/github.com/hashicorp/vault/api
- hvac Python library (System backend / Wrapping): https://python-hvac.org/en/stable/usage/system_backend/wrapping.html

## Issues Found

1. **Incorrect KV v2 path in `vault kv get` CLI examples.** The "Setting TTL via CLI" section used paths like `secret/data/myapp/credentials` with the `vault kv get` command. The `vault kv get` command automatically prepends `/data/` for KV v2 mounts, so the explicit `/data/` segment results in the wrong API call (it would attempt to read `secret/data/data/myapp/...`). Fixed all three commands to use `secret/myapp/credentials`, `secret/myapp/api-key`, and `secret/myapp/one-time-password` respectively. The literal `/data/` path remains correct in the raw HTTP/curl example, which is unchanged. The complete workflow example near the end was already using the correct (non-`/data/`) form.

2. **Incorrect CLI command for looking up a wrapping token.** The "Verifying Wrapped Token Validity" section used `vault token lookup $WRAPPING_TOKEN`, which targets `auth/token/lookup`. Wrapping tokens have a restricted policy that does not permit this, and the proper wrapping-specific endpoint is `sys/wrapping/lookup`. Replaced with `vault write sys/wrapping/lookup token=$WRAPPING_TOKEN`, which is the documented CLI form and matches the curl example that follows it.

## Review Notes

- The Go snippet calls `client.Logical().Unwrap("")` after `client.SetToken(wrappingToken)`. Passing an empty string causes the SDK to fall back to the client's currently-set token, so this works. An equivalent form would be `client.Logical().Unwrap(wrappingToken)` without setting the client token.
- The hvac call `client.sys.unwrap(token=wrapping_token)` is valid; the wrapping namespace also exposes `client.sys.unwrap()` reading the client's configured token.
- The curl unwrap example correctly supplies the wrapping token via `X-Vault-Token` with no request body. Per HashiCorp docs, supplying the token both in the header and the body causes the wrap to be revoked without returning the data — worth noting for readers but not incorrect as written.
- The sample audit log entries are illustrative; in real Vault audit output the `accessor` and `token` field values are HMAC-SHA256 hex digests rather than the literal `hmac-sha256:...` prefix shown, but the structure and field names are accurate.
- The `wrap_info.wrapped_accessor` field is shown as an empty string in the wrapped response, which is correct for non-auth wraps (it is only populated when wrapping an auth response that contains a client token).
