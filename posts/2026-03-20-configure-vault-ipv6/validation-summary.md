# Validation Summary: How to Configure Vault with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- HashiCorp Vault (TCP listener, Raft integrated storage, HA cluster_addr/api_addr)
- HCL configuration syntax
- IPv6 addressing (RFC 3986 bracket notation)
- Vault CLI (`vault server`, `vault operator init/unseal`, `vault kv`, `vault status`)
- curl with IPv6 (`-6` flag)
- Python `hvac` client (KV v2 secrets engine)

## Sources Consulted
- HashiCorp Vault TCP listener documentation: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault Raft storage documentation: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- HashiCorp Vault top-level configuration (`api_addr`, `cluster_addr`): https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Vault `server` command flags (`-dev-listen-address`): https://developer.hashicorp.com/vault/docs/commands/server
- hvac (Python Vault client) KV v2 docs: https://hvac.readthedocs.io/en/stable/usage/secrets_engines/kv_v2.html
- curl manual page (`-6, --ipv6`)
- RFC 3986 (URI bracket notation for IPv6 hosts)

## Issues Found

1. **Invalid `purpose = "cluster"` listener parameter (Listen on All Interfaces section).**
   The original config defined a second `listener "tcp"` block with `purpose = "cluster"`. This parameter does not exist in Vault's TCP listener stanza. Vault uses a single listener for both API and cluster traffic; the cluster bind is controlled by the `cluster_address` parameter on the same listener (defaulting to one port above `address`).
   **Fix:** Replaced the two-listener example with a single listener using `address = "[::]:8200"` and `cluster_address = "[::]:8201"`, which is the documented way to bind cluster traffic to a specific interface/port.

## Review Notes
- All other technical content checked out: HCL bracket notation for IPv6 in `address`, `api_addr`, `cluster_addr`, and Raft `retry_join.leader_api_addr`; the `-dev-listen-address` flag for `vault server -dev`; `VAULT_ADDR` / `VAULT_TOKEN` environment variables; `vault kv put/get/list` syntax; `curl -6` to force IPv6; and the hvac client's `secrets.kv.v2.create_or_update_secret` / `read_secret_version` methods (with `path`, `secret`, `mount_point` arguments) match the current public APIs.
- Mixed boolean styles (`tls_disable = false` vs `tls_disable = 1`) are both accepted by HCL and by Vault, so no change was made — though `tls_disable = "true"` is the form most commonly shown in the official docs.
- The post uses the documentation prefix `2001:db8::/32` (RFC 3849) for examples, which is appropriate for tutorials.
