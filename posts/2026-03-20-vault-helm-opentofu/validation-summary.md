# Validation Summary: How to Deploy HashiCorp Vault on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault (server, Agent injector, KV v2, Kubernetes auth method, AWS KMS auto-unseal, Raft integrated storage)
- OpenTofu / Terraform (`helm`, `aws`, `vault`, `kubernetes` providers)
- HashiCorp Vault Helm chart (v0.27.0)
- Kubernetes (Deployments, ServiceAccounts)
- AWS (KMS, IAM, IRSA via EKS OIDC provider)

## Sources Consulted
- Vault Helm chart values reference: https://github.com/hashicorp/vault-helm/blob/main/values.yaml
- Vault Helm chart releases: https://github.com/hashicorp/vault-helm/releases
- Vault AWS KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- Vault Agent Injector: https://developer.hashicorp.com/vault/docs/platform/k8s/injector
- Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- Vault Raft integrated storage: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- Terraform Vault provider — `vault_kubernetes_auth_backend_role`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kubernetes_auth_backend_role
- Terraform Vault provider — `vault_kubernetes_auth_backend_config`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kubernetes_auth_backend_config

## Issues Found
- **Vault Agent Injector annotations on the wrong object (Step 4).** The `vault.hashicorp.com/agent-inject-secret-config.env` and `vault.hashicorp.com/agent-inject-template-config.env` annotations were placed on the Deployment metadata. The Vault Agent Injector is a `MutatingAdmissionWebhook` that intercepts Pod CREATE/UPDATE events and only reads annotations from the Pod object — Deployment-level annotations are not propagated to Pods. As written, the agent sidecar would be injected (because `agent-inject` was duplicated on the Pod template) but no secrets would be fetched or rendered. Fixed by consolidating all four annotations onto `spec.template.metadata.annotations` and removing the redundant Deployment-level annotation map.

## Review Notes
- The Vault Helm chart version pinned in the post (`0.27.0`, released 2023-11-16) is valid but quite old. The latest at review time is `0.32.0` (2026-01-14, appVersion 1.21.2). The pinned version still installs and the values keys used are unchanged, so this was not edited, but readers may want to bump to a current chart for security and feature fixes.
- The IAM policy permissions for AWS KMS auto-unseal (`kms:Encrypt`, `kms:Decrypt`, `kms:DescribeKey`) match the official requirements; `kms:GenerateDataKey` is intentionally not needed because Vault encrypts the root key directly with the KMS key rather than using envelope encryption.
- Step 3 references `data.kubernetes_secret.vault_sa_token` without defining it. Readers will need to declare a corresponding `data "kubernetes_secret"` block (or use a token reviewer JWT pattern) — this is an acceptable forward reference for a tutorial that scopes Step 3 as a post-unseal bootstrap.
- The Helm `server.ha.raft.config` HCL string interpolates `${aws_kms_key.vault_unseal.key_id}` inside a heredoc that is itself inside `yamlencode(...)`. This works because the interpolation is resolved by Terraform/OpenTofu before the heredoc is yaml-encoded; the resulting plain string is passed to the chart as expected.
