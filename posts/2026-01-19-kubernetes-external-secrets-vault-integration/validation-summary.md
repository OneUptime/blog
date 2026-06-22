# Validation Summary: How to Secure Kubernetes Secrets with External Secrets Operator

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Secrets, RBAC, audit logging, and Deployments
- External Secrets Operator
- HashiCorp Vault and Vault Kubernetes auth
- AWS Secrets Manager and IAM/IRSA
- Helm
- Stakater Reloader
- Prometheus ServiceMonitor and PromQL

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator AWS Secrets Manager provider documentation: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator PushSecret API: https://external-secrets.io/latest/api/pushsecret/
- External Secrets Operator Password generator documentation: https://external-secrets.io/latest/api/generator/password/
- External Secrets Operator metrics documentation: https://external-secrets.io/latest/api/metrics/
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault dev server documentation: https://developer.hashicorp.com/vault/docs/concepts/dev-server
- HashiCorp Vault Helm chart documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run

## Issues Found
- Corrected the opening Kubernetes Secrets claim to note that Kubernetes Secrets are base64 encoded in manifests and stored unencrypted in etcd by default unless encryption at rest is configured.
- Corrected the audit logging claim because Kubernetes can audit Secret reads when API server audit policy and backend configuration are enabled.
- Updated ESO manifests from deprecated `external-secrets.io/v1beta1` to current `external-secrets.io/v1`.
- Corrected the install verification text because current ESO installs more CRDs than only `secretstores`, `clustersecretstores`, and `externalsecrets`.
- Adjusted the Vault dev-mode KV setup to account for dev mode usually mounting KV v2 at `secret/` by default.
- Fixed Vault Kubernetes auth setup by removing a local-only service account CA file reference and adding the required TokenReview ClusterRoleBinding for the Vault service account.
- Corrected Vault KV v2 `remoteRef.key` and PushSecret `remoteKey` examples so paths are relative to the configured SecretStore mount instead of duplicating `secret/data/`.
- Added a PushSecret permission caveat because the read-only Vault policy shown earlier would not allow reverse sync.
- Added required `spec.selector` and matching pod labels to `apps/v1` Deployment examples.
- Removed the misleading Nginx `postStart` reload example, which did not watch secret changes, and replaced it with a correct note that the application or sidecar must watch the mounted files and signal reload.
- Fixed Prometheus metric names to match ESO documentation: `externalsecret_sync_calls_error` and `externalsecret_provider_api_calls_count`.

## Review Notes
The examples are now aligned with current ESO documentation as of 2026-06-22. IRSA setup still assumes the referenced service account is created and annotated with the appropriate IAM role outside the shown SecretStore snippet.
