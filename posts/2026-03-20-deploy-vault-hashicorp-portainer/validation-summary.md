# Validation Summary: How to Deploy Vault (HashiCorp) via Portainer

## Status
validated

## Post Type
Guide / deployment tutorial

## Technologies Covered
- HashiCorp Vault
- Portainer
- Docker Compose
- Docker named volumes
- Vault CLI
- OneUptime health monitoring

## Sources Consulted
- Vault server command docs: https://developer.hashicorp.com/vault/docs/commands/server
- Vault configuration parameters: https://developer.hashicorp.com/vault/docs/configuration
- Vault TCP listener configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- Vault filesystem storage backend: https://developer.hashicorp.com/vault/docs/configuration/storage/filesystem
- Vault UI docs: https://developer.hashicorp.com/vault/docs/ui
- Vault seal/unseal concepts: https://developer.hashicorp.com/vault/docs/concepts/seal
- KV v2 setup docs: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- Vault KV CLI docs: https://developer.hashicorp.com/vault/docs/commands/kv
- Vault health endpoint docs: https://developer.hashicorp.com/vault/api-docs/system/health
- Vault CLI tutorial showing default mounts and current KV examples: https://developer.hashicorp.com/vault/tutorials/get-started/learn-cli

## Issues Found
- The post said the compose stack ran Vault in development mode. I changed this to server mode because `vault server -config=...` starts a normal sealed server; dev mode requires `vault server -dev` and uses in-memory storage.
- The compose example advertised `0.0.0.0` as Vault's address via `VAULT_API_ADDR`, and the config file used `api_addr = "http://0.0.0.0:8200"`. I removed the compose env vars and changed `api_addr` to `http://<server-ip-or-dns>:8200` because `api_addr` must be a full routable URL, not a wildcard bind address.
- The prerequisites listed `At least 256MB RAM`. I replaced this with a host IP/DNS prerequisite because I did not find an authoritative Vault doc backing that specific minimum for this deployment pattern.
- The config-file instructions said to populate the config volume before deploy "or by exec-ing into the container after first start." I corrected this to require pre-populating the volume before starting the Vault service, because the container command depends on `/vault/config/config.hcl` existing at startup.
- The seal/unseal note was too general. I changed it to say that this Shamir-sealed setup requires manual unseal after restart, which matches the documented default seal behavior.
- The health-check section implied only `200`, `503`, and `501` matter. I corrected it to reflect that this single-node deployment should see `200/503/501`, while HA standby nodes return `429` by default.
- The KV examples used the older path-style CLI syntax and mounted the engine at `secret/`, which can be ambiguous across Vault setups. I switched the examples to a distinct `kv` mount and the current `vault kv ... -mount=...` syntax recommended by the Vault CLI docs.

## Review Notes
- The post still uses `hashicorp/vault:latest`. That is valid, but pinning a specific Vault tag would make the guide more reproducible over time.
- The example intentionally disables TLS. That is acceptable for local testing, but production or internet-exposed deployments should enable TLS and use a certificate trusted by clients.
- The filesystem storage backend is suitable for single-node durability, but it does not support high availability. This matches the post's small-team/homelab positioning.
