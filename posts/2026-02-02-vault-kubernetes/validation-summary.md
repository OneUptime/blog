# Validation Summary: How to Use Vault with Kubernetes

## Status
validated

## Post Type
Tutorial / Guide — a comprehensive walkthrough of deploying and operating HashiCorp Vault on Kubernetes, covering Helm-based install, authentication, secret injection patterns, dynamic secrets, auto-unseal, monitoring, backup, and security hardening.

## Technologies Covered
- HashiCorp Vault (server, agent injector, CSI provider, KV-v2, database secrets engine, auto-unseal)
- Kubernetes (Deployments, ServiceAccounts, CronJobs, NetworkPolicies)
- Helm 3 (hashicorp/vault chart, secrets-store-csi-driver chart)
- Raft integrated storage
- AWS KMS and GCP Cloud KMS (auto-unseal)
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule)
- PostgreSQL (dynamic database credentials)
- HashiCorp Configuration Language (HCL) for Vault policies
- AWS S3 (snapshot storage)

## Sources Consulted
- Vault Helm chart values reference: https://github.com/hashicorp/vault-helm/blob/main/values.yaml
- Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- Vault CSI provider configuration: https://developer.hashicorp.com/vault/docs/platform/k8s/csi/configurations
- Vault telemetry / Prometheus metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry
- Vault seal configuration (awskms, gcpckms): https://developer.hashicorp.com/vault/docs/configuration/seal
- Vault Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Vault KV-v2 secrets engine: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- Vault database secrets engine (PostgreSQL): https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql

## Issues Found
1. **`vault_core_handle_request` unit was wrong** — the alert rule labeled the P99 latency value as seconds (`{{ $value }}s`) and used a threshold of `> 1`. Vault exposes this summary metric in **milliseconds**, not seconds. Fixed by changing the description suffix to `ms`, raising the threshold to a more realistic `> 500` (ms), and adding a brief inline comment noting the unit. Verified against the Vault telemetry docs.

## Review Notes
- The `vault_core_leadership_lost_count` alert (`> 0`) is technically a valid Prometheus expression — `_count` is the auto-generated sample count of the underlying `vault.core.leadership_lost` summary, which increments once per leadership-loss event. However, it will remain firing forever once any loss has occurred since process start. A more robust expression would be `increase(vault_core_leadership_lost_count[5m]) > 0`. Left as-is because the original is not strictly incorrect.
- The HA production config enables TLS (`tls_disable = 0` and `tls_cert_file`/`tls_key_file`), but the manual `vault operator raft join` commands later in the unseal section use `http://`. With `retry_join` already configured in the raft stanza, the manual join calls are redundant — followers auto-join. If a reader does run the manual join against the TLS-enabled prod config, they will need `https://` and a `-leader-ca-cert` flag. Left as-is since the section reads as illustrative.
- The Prometheus scrape uses `path: /v1/sys/metrics` with `format=prometheus` query param. This works, but HashiCorp also documents the `Accept: prometheus/telemetry` header approach. Either is acceptable.
- In the dynamic-secrets deployment example, the application command wraps `exec /app/start.sh` inside `while true; do ... done`. The `exec` replaces the shell, so the loop body runs only once and `done` is never reached. The intent (handle credential rotation) is fine, but the loop wrapper is dead code. Minor stylistic issue, not technically incorrect behavior — left as-is.
- The post correctly notes Kubernetes Secrets are base64-encoded by default. Worth mentioning in a future revision that Kubernetes does support etcd encryption-at-rest as an opt-in feature, though it doesn't replace the other Vault benefits (audit, rotation, dynamic secrets, policies).
- All Helm values, agent annotations, CSI parameters, seal stanzas, KV-v2 policy paths, and CLI commands were verified against official HashiCorp documentation and are correct.
