# Validation Summary: How to Set Up Vault High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (HA mode, integrated Raft storage, Consul backend)
- HashiCorp Consul (storage backend + ACL policies)
- HCL (Vault configuration language)
- Systemd (service unit configuration)
- AWS KMS / Azure Key Vault (auto-unseal)
- Kubernetes + HashiCorp Vault Helm chart
- HAProxy / Nginx (load balancing)
- Prometheus + Grafana (metrics, alerting, dashboards)
- Bash (backup, restore, failover automation scripts)
- AWS S3 + AWS CLI (snapshot archival)

## Sources Consulted
- Vault TCP listener docs: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- Vault integrated Raft storage docs: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- Vault Consul storage backend docs: https://developer.hashicorp.com/vault/docs/configuration/storage/consul
- Vault auto-unseal docs: https://developer.hashicorp.com/vault/docs/configuration/seal
- Vault Agent caching docs (re: `cache` stanza scope): https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/caching
- Vault telemetry metrics reference: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- `/sys/health` API docs: https://developer.hashicorp.com/vault/api-docs/system/health
- Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/platform/k8s/helm/configuration
- `vault operator raft` CLI docs: https://developer.hashicorp.com/vault/docs/commands/operator/raft

## Issues Found

1. **`max_request_size` placed at top level of vault.hcl (Performance Tuning section).**
   This is a **listener-level** parameter, not a top-level configuration. Per the Vault TCP listener docs, `max_request_size` belongs inside the `listener "tcp"` stanza. Moved it inside the listener block in the Performance Tuning example.

2. **`cache { use_auto_auth_token = true }` stanza in Vault server config (Performance Tuning section).**
   The `cache` stanza is exclusively a **Vault Agent** configuration block (used for client-side caching with auto-auth) and has no meaning in a Vault server configuration file. Removed it entirely from the server `vault.hcl` snippet.

3. **`tls_prefer_server_cipher_suites = true` in listener (Performance Tuning section).**
   This option is deprecated and has no effect — the Go TLS stack stopped honoring server cipher suite preferences (especially under TLS 1.3). Removed the line.

4. **`disable_mlock = false` recommended for a Raft-based HA deployment (Node Configuration section).**
   With integrated Raft (BoltDB), HashiCorp now recommends `disable_mlock = true` because BoltDB's memory-mapped files are incompatible with mlock and can cause Vault to load the entire database into RAM (OOM risk). Changed to `disable_mlock = true` and updated the inline comment to reflect the Raft-specific guidance.

## Review Notes
- The `vault_raft_peers` Prometheus metric used in alerting is correct — Vault does export the underlying `vault.raft.peers` gauge.
- The HAProxy health check `/v1/sys/health?standbyok=true` is appropriate for balancing across all nodes (active + standby). If the cluster ever runs Vault Enterprise performance standbys, the `perfstandbyok=true` query parameter should be added as well; not changed since the post does not assume Enterprise.
- The Consul backend example includes both `storage "consul"` and a redundant `ha_storage "consul"` block. This is unusual (Consul provides HA natively via the storage stanza) but not technically incorrect, so left in place.
- The Vault CLI commands (`vault operator init`, `vault operator raft list-peers`, `vault operator raft snapshot save/restore`, `vault operator step-down`) and their flags are all current and correct.
- The Helm chart values (`server.ha.raft.*`, `server.dataStorage.*`, `server.extraVolumes`, `injector.replicas`, `ui.serviceType`) match the official `hashicorp/vault` chart schema.
- The Consul ACL policy stanzas (`key_prefix`, `service`, `session_prefix`, `agent_prefix`) and the `service_tags` comma-separated string format match Vault's documented Consul backend requirements.
