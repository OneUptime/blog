# Validation Summary: How to Handle Kubernetes Secrets from Vault with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- Kubernetes
- Kubernetes Secrets
- HashiCorp Vault
- Vault Helm chart
- Vault Kubernetes auth method
- Vault Agent Injector
- Vault Secrets Store CSI provider
- Secrets Store CSI Driver
- External Secrets Operator

## Sources Consulted
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Secrets Store CSI provider installation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/installation
- HashiCorp Vault Secrets Store CSI provider configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/configurations
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator HashiCorp Vault provider: https://external-secrets.io/latest/provider/hashicorp-vault/
- Terraform Vault provider `vault_kubernetes_auth_backend_role`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kubernetes_auth_backend_role
- Terraform Vault provider `vault_kv_secret_v2`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kv_secret_v2
- Terraform Helm provider `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release

## Issues Found
- The opening paragraph said Kubernetes Secrets have no audit trail for secret access. Kubernetes API audit logging can record API access when configured, so I narrowed the claim to say Kubernetes Secrets do not provide Vault-style per-secret access audit trails.
- The Vault Helm chart examples pinned `0.27.0`, while current HashiCorp documentation shows the official chart at `0.32.0`. I updated both Vault chart references.
- The Vault Kubernetes auth role only bound `app-sa` in `production`, but the External Secrets Operator example authenticated with `external-secrets-sa` in `external-secrets`. I added that service account and namespace to the role binding.
- Current Vault/ESO documentation notes that Vault 1.21+ requires an audience for Kubernetes auth roles. I added `audience = "vault"` to the Vault role, `audience: "vault"` to the CSI SecretProviderClass, and `audiences: ["vault"]` to the ESO service account reference.
- The sidecar example used `source` under `/bin/sh`, which is not POSIX shell syntax. I changed it to `. /vault/secrets/db`.
- The Secrets Store CSI Driver chart pin was old. I updated it from `1.4.0` to `1.5.6`, matching the current chart metadata available during review.
- The External Secrets Operator example used the deprecated `external-secrets.io/v1beta1` API and an old `0.9.11` chart. I updated the manifests to `external-secrets.io/v1` and the chart to `2.5.0`.
- The Terraform `jsonencode` object used `main-key = var.api_key`, which is invalid HCL because unquoted object keys cannot contain hyphens. I changed it to `"main-key" = var.api_key`.

## Review Notes
The examples still assume supporting resources such as the `production` namespace, provider configuration, Vault initialization/unseal, KV v2 enablement at `secret`, and any required TokenReview RBAC are handled elsewhere. That is acceptable for a focused blog post, but a future expansion could call out those prerequisites explicitly.
