# Validation Summary: How to Run Vault in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- HashiCorp Vault
- Vault dev server mode
- Vault KV v2 secrets engine
- Vault file storage backend
- Vault policies
- Vault Transit and TOTP secrets engines
- HTTP API and CLI usage

## Sources Consulted
- HashiCorp Vault official Docker image documentation: https://hub.docker.com/r/hashicorp/vault
- Vault dev server setup documentation: https://developer.hashicorp.com/vault/tutorials/get-started/setup
- Vault dev server concept documentation: https://developer.hashicorp.com/vault/docs/concepts/dev-server
- Vault configuration parameters documentation: https://developer.hashicorp.com/vault/docs/configuration
- Vault CLI command documentation: https://developer.hashicorp.com/vault/docs/commands
- Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Vault KV v2 command documentation: https://developer.hashicorp.com/vault/docs/commands/kv
- Vault KV v2 setup and policy documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- Vault system init API documentation: https://developer.hashicorp.com/vault/api-docs/system/init
- Vault system unseal API documentation: https://developer.hashicorp.com/vault/api-docs/system/unseal
- Podman volume option documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The container run examples used the short image name `hashicorp/vault:latest` after pulling `docker.io/hashicorp/vault:latest`. Updated the run commands to use the fully qualified image name consistently, avoiding Podman short-name resolution issues.
- Vault CLI commands executed inside the dev container did not set `VAULT_ADDR`. Vault CLI defaults to HTTPS at `https://127.0.0.1:8200`, while the dev container listens over HTTP. Added `VAULT_ADDR=http://127.0.0.1:8200` to the dev container environment so `podman exec` CLI examples use the correct address.
- The KV v2 CLI examples used the older path-like syntax. Updated them to the documented `-mount=secret` form to avoid KV v1/KV v2 path confusion.
- The file-storage initialization command built an invalid URL from `$VAULT_ADDR:8201` when `VAULT_ADDR` already included a port. Updated the example to set `VAULT_ADDR='http://localhost:8201'` and call `$VAULT_ADDR/v1/sys/init`.
- The file-storage flow initialized Vault but did not unseal it. Added an API unseal step using the generated unseal key because non-dev Vault starts sealed and must be unsealed before normal operations.
- The file-storage `api_addr` advertised `http://0.0.0.0:8200`, which is a bind address rather than a useful client address. Updated it to `http://127.0.0.1:8201` for the local Podman port mapping shown in the tutorial.
- The read-only policy granted `list` on the KV v2 `data` path and then added a broad deny rule. KV v2 listing requires `list` on the `metadata` path, and Vault policies are deny-by-default. Updated the policy to grant `read` on `secret/data/myapp/*` and `list` on the matching `secret/metadata/myapp` paths.
- The Transit encryption example used `echo`, which includes a trailing newline in the encoded plaintext. Changed it to `printf` so the encrypted plaintext is exactly `secret data`.

## Review Notes
- Podman was not installed in the local review environment, so commands were verified against official Podman and HashiCorp Vault documentation rather than executed locally.
- The file-storage example is suitable for local testing only because it disables TLS and stores initialization material in `~/vault-init.json`.
