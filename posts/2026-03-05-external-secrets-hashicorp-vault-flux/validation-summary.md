# Validation Summary: How to Configure External Secrets with HashiCorp Vault in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRepository and HelmRelease
- External Secrets Operator
- Kubernetes custom resources and RBAC
- HashiCorp Vault Kubernetes authentication
- HashiCorp Vault KV v2 secrets engine
- Kubernetes ServiceAccount tokens and TokenReview API

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator API specification: https://external-secrets.io/v0.19.2/api/spec/
- External Secrets Operator Helm chart repository index: https://charts.external-secrets.io/index.yaml
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth HTTP API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault KV v2 documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- Kubernetes kubectl create clusterrolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_clusterrolebinding/

## Issues Found
No technical issues found.

## Review Notes
The External Secrets Operator chart repository currently includes 2.x chart versions, so the HelmRelease version constraint is plausible as of this review. The Vault role audience and ESO `serviceAccountRef.audiences` examples are consistent with current ESO and Vault guidance, including Vault's newer requirement for configured audiences. The post assumes the `external-secrets` service account name created by the Helm chart; installations that override chart values should adjust the Vault role and ClusterSecretStore accordingly.
