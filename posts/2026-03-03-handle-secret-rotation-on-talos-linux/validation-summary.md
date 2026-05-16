# Validation Summary: How to Handle Secret Rotation on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Secrets, CronJobs, RBAC, Deployments)
- kubectl
- Helm
- External Secrets Operator (ESO)
- HashiCorp Vault (Vault Agent Injector, dynamic database credentials)
- Stakater Reloader
- jq, base64, /dev/urandom (shell tooling)

## Sources Consulted
- Kubernetes Secrets documentation — https://kubernetes.io/docs/concepts/configuration/secret/ (mounted Secrets update behavior, stringData handling)
- kubectl reference — https://kubernetes.io/docs/reference/kubectl/ (`rollout restart`, `patch`, `create --dry-run=client`, `exec deployment/...`)
- Kubernetes CronJob API (batch/v1) — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC reference — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator docs — https://external-secrets.io/ (SecretStore, ExternalSecret API, Vault provider)
- HashiCorp Vault Agent Injector annotations — https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- Stakater Reloader documentation — https://github.com/stakater/Reloader (annotation `secret.reloader.stakater.com/reload`)
- Helm chart references for external-secrets and stakater/reloader

## Issues Found
No technical issues found.

## Review Notes
- The ExternalSecret/SecretStore examples use `external-secrets.io/v1beta1`. This API version still works, but External Secrets Operator promoted `external-secrets.io/v1` to GA in version 0.10.0 (mid-2024). New deployments should consider using `v1`; the field structure used in the examples is compatible with both versions.
- The CronJob password generator (`head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9!@#$%' | head -c 24`) is functional, but `base64` only emits `A-Za-z0-9+/=`, so the `!@#$%` characters in the `tr` allowlist have no effect and the output will only ever contain alphanumerics. Not incorrect — just slightly misleading about character classes.
- The Vault server URL `https://vault.internal.svc.cluster.local:8200` assumes Vault lives in a namespace literally called `internal`. Readers may need to adjust to match their own namespace (e.g. `vault.vault.svc.cluster.local`).
- The `--dry-run=client -o yaml | kubectl apply -f -` pattern correctly replaces the Secret without leaving stale keys; worth being aware this fully replaces rather than merges.
- The kubelet propagation delay claim of "about 60 seconds" reflects the default kubelet sync period; with the watch-based cache (default in modern kubelet) propagation is often faster, while configMap/secret cache TTL or sync period settings can change this.
