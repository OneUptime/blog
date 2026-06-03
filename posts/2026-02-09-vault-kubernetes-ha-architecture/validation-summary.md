# Validation Summary: How to deploy Vault on Kubernetes with HA architecture

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- HashiCorp Vault
- Vault Helm chart
- Kubernetes
- Helm
- Vault integrated storage / Raft
- Vault CLI
- Kubernetes Services and CronJobs
- Bash and jq

## Sources Consulted
- HashiCorp Vault Kubernetes deployment guide: https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-raft-deployment-guide
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault integrated storage configuration: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- HashiCorp Vault integrated storage concepts: https://developer.hashicorp.com/vault/docs/concepts/integrated-storage
- HashiCorp Vault operator init command: https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Vault operator raft command: https://developer.hashicorp.com/vault/docs/commands/operator/raft
- HashiCorp Vault status command: https://developer.hashicorp.com/vault/docs/commands/status
- HashiCorp Vault health API: https://developer.hashicorp.com/vault/api-docs/system/health
- HashiCorp Vault Raft Autopilot docs: https://developer.hashicorp.com/vault/docs/concepts/integrated-storage/autopilot
- HashiCorp Vault Raft Autopilot API docs: https://developer.hashicorp.com/vault/api-docs/system/storage/raftautopilot

## Issues Found
- The manual Raft join fallback showed joining standby nodes after the unseal flow. For Raft used as the storage backend, standby nodes must join before unsealing when using manual join. Updated the fallback commands to join each standby first, then unseal it.
- The service section implied that users should create services that the Helm chart already creates in HA mode. Updated the text to state that the Helm chart creates these services and that the YAML is only for equivalent manual services.
- The HA test and monitoring scripts used `.is_self` from `vault status -format=json`, which is not a documented status field. Replaced it with `.ha_mode`.
- The HA test wrote to `secret/test-ha` without enabling a KV secrets engine. Added `vault secrets enable -path=secret kv-v2` before writing the test secret.
- The health check snippet used raw Kubernetes probe structure while describing Helm chart values, and it stated liveness was already included. Updated it to use Vault Helm chart `server.livenessProbe` and `server.readinessProbe` values, noting that readiness is enabled by default and liveness must be enabled explicitly.
- The backup script and CronJob could target a standby node, but Raft snapshots must be taken from the active node. Updated the backup script to select the pod labeled `vault-active=true` and changed the CronJob `VAULT_ADDR` to `http://vault-active:8200`.
- The performance tuning snippet placed Autopilot settings in the Vault server configuration. Vault Autopilot settings are managed after initialization through the Raft Autopilot command/API, not by an `autopilot` server config stanza. Replaced that part with `vault operator raft autopilot set-config`.

## Review Notes
- The example disables TLS for simplicity. That is technically valid for a lab deployment, but production deployments should enable TLS and configure `retry_join` TLS options where required.
- The backup CronJob still assumes the referenced token Secret and backup PVC already exist. Those are operational prerequisites rather than syntax errors in the shown CronJob.
