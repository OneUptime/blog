# Validation Summary: How to Use Vault with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (server, agent, secrets engines, AppRole auth)
- Docker / Docker Compose
- HCL configuration format
- Vault CLI (`vault operator`, `vault secrets`, `vault auth`, `vault kv`, `vault audit`, `vault write/read`)
- Python `hvac` client library
- PostgreSQL (via `psycopg2-binary`) and Vault's database secrets engine
- Prometheus metrics scraping
- Audit logging (file + syslog devices)
- Vault Agent templates (Consul Template syntax)

## Sources Consulted
- HashiCorp Vault Docker image documentation: https://hub.docker.com/r/hashicorp/vault
- Official Vault configuration reference: https://developer.hashicorp.com/vault/docs/configuration
- Storage backends (file vs raft/integrated storage): https://developer.hashicorp.com/vault/docs/configuration/storage
- Raft snapshot operator command: https://developer.hashicorp.com/vault/docs/commands/operator/raft
- `vault kv put` flags (including `-metadata`): https://developer.hashicorp.com/vault/docs/commands/kv/put
- AppRole auth method: https://developer.hashicorp.com/vault/docs/auth/approle
- KV v2 secrets engine API: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- Database secrets engine (PostgreSQL plugin): https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- Vault Agent docs and template syntax: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent
- Audit devices (file, syslog): https://developer.hashicorp.com/vault/docs/audit
- Prometheus telemetry endpoint `/v1/sys/metrics`: https://developer.hashicorp.com/vault/docs/internals/telemetry
- `hvac` Python client docs: https://hvac.readthedocs.io
- Docker Compose v3.8 spec reference

## Issues Found
1. **Inconsistent storage backend vs. backup command.** The production `vault-config.hcl` used `storage "file"`, but the conclusion later recommended `vault operator raft snapshot save/restore`, which only works with the Raft (integrated) storage backend. With a file backend, those commands fail with an error such as "raft is not configured". Fixed by switching the example storage stanza to `storage "raft" { path = "/vault/data"; node_id = "vault-1" }`, which is HashiCorp's current recommended production backend and makes the snapshot commands shown later in the post actually work. Also updated the architecture diagram that previously contradicted itself by showing both "Consul Backend" and "File Storage Volume" feeding the same Vault server — it now shows a single Raft integrated storage node consistent with the configuration.

## Review Notes
- The dev-mode `docker run` command does not pass a `-dev` flag explicitly; it relies on the `hashicorp/vault` image's default CMD (`server -dev`) combined with the `VAULT_DEV_*` environment variables. This works correctly with the official image, though the inline comments describing "the `-dev` flag" are slightly misleading since the flag isn't on the visible command line. Left as-is because the command functions correctly.
- `tls_disable = "false"` is written as a quoted string. Vault's HCL parser accepts both string and boolean forms for this field, so this is valid (if non-idiomatic).
- The vault-agent Docker Compose service mounts `approle-creds:/vault:ro` alongside bind mounts at `/vault/templates`, `/vault/certs`, `/vault/config`, and `/vault/secrets`. Linux mount namespacing allows overlapping mounts at distinct subpaths, so this works, but the post does not show how the `approle-creds` volume gets seeded with `role-id` / `secret-id` files — an operator would need an init step (manual copy, init container, or CI pipeline) for the agent to authenticate.
- The healthcheck `vault status -address=https://127.0.0.1:8200 -tls-skip-verify` returns exit code 2 when Vault is sealed, so the container will report `unhealthy` until Vault is initialized and unsealed. This is expected Vault behavior, but it does mean `depends_on: condition: service_healthy` won't be satisfied until the operator (or the included init script) performs unsealing.
- `hvac>=1.2.0` is pinned in `requirements.txt`. With hvac 2.x, `client.secrets.kv.v2.read_secret_version(...)` emits a `DeprecationWarning` about `raise_on_deleted_version`; the call still works but readers upgrading hvac may want to pass that argument explicitly.
- `version: '3.8'` in the Compose files is ignored (with a warning) by Docker Compose v2, but it remains valid syntax.
- The `vault audit enable syslog` example is correct but requires a syslog daemon reachable from inside the container; readers using purely containerized stacks may need to mount `/dev/log` or use the file audit device instead.
