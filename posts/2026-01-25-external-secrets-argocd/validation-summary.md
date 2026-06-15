# Validation Summary: How to Use External Secrets with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- External Secrets Operator
- Kubernetes Secrets and ServiceAccounts
- Helm
- HashiCorp Vault
- AWS Secrets Manager and IRSA
- Azure Key Vault and Azure Workload Identity
- Google Cloud Secret Manager and GKE Workload Identity
- Kustomize
- Prometheus alerting

## Sources Consulted
- External Secrets Operator introduction: https://external-secrets.io/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator HashiCorp Vault provider: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator AWS Secrets Manager provider: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator Azure Key Vault provider: https://external-secrets.io/latest/provider/azure-key-vault/
- External Secrets Operator Google Secret Manager provider: https://external-secrets.io/latest/provider/google-secrets-manager/
- External Secrets Operator PushSecret API: https://external-secrets.io/latest/api/pushsecret/
- External Secrets Operator metrics reference: https://external-secrets.io/latest/api/metrics/
- External Secrets Operator Helm chart release information: https://github.com/external-secrets/external-secrets/releases
- Argo CD secret management guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/secret-management/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/

## Issues Found
- The ESO examples used `external-secrets.io/v1beta1` for core resources. Current ESO documentation shows `external-secrets.io/v1` for `ExternalSecret`, `SecretStore`, and `ClusterSecretStore`, so the examples were updated to `external-secrets.io/v1`. `PushSecret` remains `external-secrets.io/v1alpha1`, matching the current API.
- The Argo CD Helm Application pinned the External Secrets chart to `0.9.0`, which is outdated relative to the current chart line. Updated `targetRevision` to `2.6.0`.
- The Vault section described the example as a `SecretStore`, but the YAML used `ClusterSecretStore`. Updated the prose to match the manifest.
- The Azure Key Vault example used `authType: ManagedIdentity` with `identityId`. ESO documentation marks the AAD Pod Identity-based ManagedIdentity flow as deprecated and recommends Workload Identity. Updated the example to use `authType: WorkloadIdentity` with a referenced annotated ServiceAccount.
- The Prometheus alert used a non-current metric name, `external_secrets_sync_calls_total{status="error"}`. Updated it to use the current ESO error counter, `increase(externalsecret_sync_calls_error[5m]) > 0`.

## Review Notes
The deployment snippets are intentionally partial examples, so they were reviewed for the fields being demonstrated rather than as complete standalone Kubernetes Deployments. The Argo CD health check is a valid Lua customization pattern, but future revisions could note that teams should verify whether their installed Argo CD version already includes built-in health behavior for the ESO resources they use.
