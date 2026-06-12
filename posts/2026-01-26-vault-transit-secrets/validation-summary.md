# Validation Summary: How to Implement Vault Transit Secrets Engine

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- HashiCorp Vault Transit Secrets Engine
- Vault CLI
- Vault ACL policies
- Python
- hvac Python client
- Go
- HashiCorp Vault Go API client
- Prometheus Python client
- Mermaid diagrams

## Sources Consulted
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Transit secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transit
- HashiCorp Vault policies documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault policies tutorial: https://developer.hashicorp.com/vault/tutorials/policies/policies
- hvac Transit secrets engine documentation: https://python-hvac.org/en/stable/usage/secrets_engines/transit.html
- HashiCorp Vault Go API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found
- The post used `aes256-gcm256` as a Transit key type. Vault's documented AES-256 GCM key type is `aes256-gcm96`, so both command examples were corrected.
- The sample encrypt and rewrap CLI responses included `key_version` fields. The documented Transit API examples return `ciphertext` for these single-item operations, so the unsupported response fields were removed.
- The Go implementation used `package vault`, while the accompanying `main.go` example called `NewTransitClient` directly without importing that package. The implementation snippet was changed to `package main` so the two snippets compile together as shown.
- The encrypt-only Vault policy included a catch-all `deny` rule for `transit/*`. Vault policies deny by default, and explicit `deny` capabilities take precedence over other capabilities, so this would block the allowed encrypt paths. The catch-all deny block was replaced with a note that no catch-all deny rule is needed.
- The key rotation Python example parsed `key_info["keys"][version]` as an object with a `creation_time` field. Vault documents this map as version to Unix epoch creation timestamp, so the code now parses the value with `datetime.fromtimestamp(..., tz=timezone.utc)`.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Future improvements could mention the 32 MB Vault HTTP API request-size limit for Transit payloads and the security tradeoffs of convergent encryption for low-entropy searchable values, but those are caveats rather than correctness issues.
