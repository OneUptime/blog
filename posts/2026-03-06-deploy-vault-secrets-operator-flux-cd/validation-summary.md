# Validation Summary: How to Deploy Vault Secrets Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault Secrets Operator
- HashiCorp Vault Kubernetes auth method
- Flux CD HelmRelease, HelmRepository, and Kustomization APIs
- Kubernetes custom resources and Secrets
- Helm chart configuration

## Sources Consulted
- HashiCorp Vault Secrets Operator Helm chart configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/helm
- HashiCorp Vault Secrets Operator Vault source and CR examples: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault
- HashiCorp Vault Secrets Operator API reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/api-reference
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Flux Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/

## Issues Found
- The repository structure omitted `dynamic-secret.yaml` and `kustomization.yaml` even though the guide later creates both files. Added them to keep the file tree accurate.
- The HelmRelease pinned `vault-secrets-operator` to `0.9.x`, while the reviewed chart documentation describes the current 1.x chart values. Updated the example to `1.4.x`.
- The Helm values used `controller.resources`, but current chart resources for the operator manager belong under `controller.manager.resources`. Moved the resource limits and requests to the documented path.
- The Helm values used `controller.manager.leaderElection.enabled`, which is not the documented chart value. Replaced it with `controller.controllerConfigMapYaml.leaderElection.leaderElect`.
- The `VaultConnection` comment described `caCertSecretRef` as a file path. The API defines it as the name of a Kubernetes secret containing `ca.crt`, so the comment was corrected.
- The `VaultAuth` was defined in `vault-secrets-operator` while the `VaultStaticSecret` and `VaultDynamicSecret` resources were in `default`, and the Kubernetes service account binding matched the operator namespace rather than the consuming namespace. Moved the auth resource to `default`, used a namespaced `vaultConnectionRef`, updated `vaultAuthRef`, and aligned the Vault role binding with the `default` service account in the `default` namespace.
- The Vault Kubernetes auth configuration omitted the reviewer JWT and CA certificate needed for a typical external Vault setup. Added placeholders for `token_reviewer_jwt`, `kubernetes_host`, and `kubernetes_ca_cert`.
- The Vault Kubernetes auth role did not set `audience=vault` even though the `VaultAuth` requested the `vault` audience. Added the audience to the role command.
- The KV v2 policy granted `list` on `secret/data/*`; listing for KV v2 is performed through the metadata path. Changed the data path to `read` and kept `read,list` on `secret/metadata/*`.
- The Flux health check targeted the Deployment produced by Helm. Flux documentation recommends checking the HelmRelease when a Kustomization contains HelmRelease objects, so the health check was changed to the HelmRelease.
- Verification and troubleshooting commands still referenced `VaultAuth` and the service account in the operator namespace after the auth resource was corrected. Updated those commands to use the `default` namespace.

## Review Notes
- The ServiceMonitor value is valid, but it requires Prometheus Operator CRDs to be installed before enabling it.
- The Vault Kubernetes auth command uses placeholders for the reviewer JWT, API server URL, and CA certificate. Operators should replace these with values appropriate for their cluster and Vault deployment model.
