# Validation Summary: How to Implement Secret Rotation with ArgoCD and Vault

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Kubernetes
- External Secrets Operator
- HashiCorp Vault
- Vault Kubernetes auth
- Vault database secrets engine for PostgreSQL
- Vault Agent Injector
- Stakater Reloader
- PrometheusRule / Prometheus monitoring

## Sources Consulted
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault leases documentation: https://developer.hashicorp.com/vault/docs/concepts/lease
- HashiCorp Vault telemetry metrics reference: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Helm chart documentation: https://developer.hashicorp.com/vault/docs/platform/k8s/helm
- External Secrets Operator Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator templating documentation: https://external-secrets.io/v0.20.3/guides/templating/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.5.9/guides-metrics/
- Argo CD Application and Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/ and https://argo-cd.readthedocs.io/en/release-2.8/user-guide/helm/
- Stakater Reloader annotation documentation: https://docs.stakater.com/reloader/main/reference/annotations.html
- Stakater Reloader chart listing: https://artifacthub.io/packages/helm/stakater/reloader

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to the current `external-secrets.io/v1` API.
- Replaced the deprecated Vault Kubernetes auth role field `ttl` with `token_ttl`.
- Added the missing Vault policy and Kubernetes auth role for the `secret-rotator` service account; the CronJob previously logged in with a role that was never created and lacked write permission to the KV v2 data path.
- Changed the rotation CronJob image from `vault:latest` to a pinned custom rotator image and noted that it must include `vault`, `jq`, `openssl`, and `psql`; the official Vault image alone is not a complete PostgreSQL rotation runtime.
- Updated stale Helm chart pins for Stakater Reloader and the HashiCorp Vault chart to current chart versions checked during review.
- Added the missing Vault policy and Kubernetes auth role for the `payment-service` service account used by the Vault Agent Injector example.
- Added `vault.hashicorp.com/agent-share-process-namespace: "true"` so the Vault Agent render command can signal the application process from the sidecar context.
- Replaced `source /vault/secrets/db-creds` with POSIX-compatible `. /vault/secrets/db-creds` for `/bin/sh`.
- Replaced monitoring expressions that used `kube_secret_created` for rotation age and a non-documented `vault_secret_lease_remaining_seconds` metric with documented External Secrets Operator and Vault telemetry metrics.
- Verified the two internal OneUptime links referenced in the summary return HTTP 200.

## Review Notes
The examples are technically valid as guide snippets, but production deployments should still add a complete `ClusterSecretStore`, RBAC for service accounts, namespace creation/sync options in Argo CD if needed, hardened image builds, and safer SQL/password handling for arbitrary usernames or passwords.
