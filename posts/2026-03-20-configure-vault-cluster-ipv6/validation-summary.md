# Validation Summary: How to Configure Vault Cluster with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (HA cluster, integrated Raft storage)
- HCL (HashiCorp Configuration Language)
- IPv6 networking (RFC 3986 bracket notation in URLs)
- OpenSSL (CA + server cert generation with IP SANs)
- ip6tables / iptables-persistent
- hvac (Python Vault client)
- systemd

## Sources Consulted
- [Vault `tcp` listener config](https://developer.hashicorp.com/vault/docs/configuration/listener/tcp)
- [Vault top-level config (`api_addr`, `cluster_addr`, `disable_mlock`, `ui`)](https://developer.hashicorp.com/vault/docs/configuration)
- [Vault integrated storage (Raft) config and `retry_join`](https://developer.hashicorp.com/vault/docs/configuration/storage/raft)
- [`vault operator init` CLI](https://developer.hashicorp.com/vault/docs/commands/operator/init)
- [`vault operator raft join` / `list-peers` CLI](https://developer.hashicorp.com/vault/docs/commands/operator/raft)
- [`vault kv put` / `vault kv get` CLI](https://developer.hashicorp.com/vault/docs/commands/kv)
- [hvac KV v2 client docs](https://hvac.readthedocs.io/en/stable/usage/secrets_engines/kv_v2.html)
- [RFC 3986 §3.2.2 (IP-literal in URI authority — bracket notation)](https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2)
- [Debian/Ubuntu `iptables-persistent` package — rules stored in `/etc/iptables/rules.v{4,6}`](https://packages.ubuntu.com/iptables-persistent)
- [OpenSSL `req` / `x509` extensions and `subjectAltName`](https://docs.openssl.org/3.0/man1/openssl-req/)

## Issues Found
- **Firewall rules save path was wrong.** The post wrote IPv6 rules to `/etc/ip6tables/rules.v6`, but the conventional path used by `iptables-persistent` / `netfilter-persistent` on Debian/Ubuntu is `/etc/iptables/rules.v6` (both v4 and v6 rules live under `/etc/iptables/`, not under separate `iptables`/`ip6tables` directories). Changed to `/etc/iptables/rules.v6` so the `ip6tables-save` redirect actually lands where the boot-time loader will pick it up.

## Review Notes
- The HCL configuration is correct: `listener "tcp"` with bracketed IPv6 in `address`, `cluster_addr`/`api_addr` as `https://[...]:port` URLs, `storage "raft"` with `path`, `node_id`, and `retry_join` blocks containing `leader_api_addr` and `leader_ca_cert_file` all match the official schema.
- `disable_mlock = false` (mlock enabled) is the correct production setting; the inline comment phrasing ("Disable mlock for containers (enable for production)") is somewhat ambiguous but not technically wrong — left as-is to preserve the author's voice.
- `vault operator raft join` against a TLS leader works without an explicit `-leader-ca-cert` flag because `VAULT_CACERT` is exported earlier in the snippet; this is consistent with HashiCorp's CLI behavior. The `retry_join` blocks in `vault.hcl` would also auto-join on startup, so the manual `raft join` step shown is informational.
- TLS cert generation uses RSA-4096 for the CA and RSA-2048 for the server cert; `subjectAltName` correctly includes both DNS and IP entries (IPv6 literals as `IP.x = 2001:db8::N`), which is required for Go's `crypto/tls` (used by Vault) to validate IPv6-addressed connections.
- `vault kv put secret/myapp ...` and the hvac `read_secret_version(path='myapp', mount_point='secret')` call assume the default KV v2 mount at `secret/`; the CLI handles the v1/v2 path translation transparently, and accessing `response['data']['data']['password']` is the documented hvac KV v2 response shape.
- `ss -tlnp | grep :8200` will match both v4 and v6 listeners; a stricter check would be `ss -tlnp -6 sport = :8200`, but the shown command is not incorrect.
