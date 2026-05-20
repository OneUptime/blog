# Validation Summary: How to Deploy Vault Agent with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Vault Agent Injector
- Vault Helm chart
- Argo CD
- Kubernetes
- Vault Kubernetes auth method
- Vault ACL policies
- Vault database secrets engine
- PostgreSQL dynamic credentials
- Prometheus ServiceMonitor

## Sources Consulted
- HashiCorp Vault Helm chart documentation: https://developer.hashicorp.com/vault/docs/platform/k8s/helm
- HashiCorp Vault Helm chart configuration documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Helm chart values for v0.32.0: https://raw.githubusercontent.com/hashicorp/vault-helm/v0.32.0/values.yaml
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes policy template tutorial: https://developer.hashicorp.com/vault/tutorials/kubernetes/policy-templates-kubernetes
- HashiCorp Vault ACL policy template documentation: https://developer.hashicorp.com/vault/docs/secrets/identity/deduplication/acl-policy-templates
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/

## Issues Found
- The post said Vault Agent renders secrets into files or environment variables. Vault Agent Injector renders secrets into files; applications can source those files to populate environment variables. Updated the wording to avoid implying direct environment variable injection.
- The wrapper chart pinned `hashicorp/vault` chart version `0.28.1`, while current HashiCorp documentation lists `0.32.0` as the current chart version. Updated the dependency version to `0.32.0`.
- The Vault server values labeled a TLS-disabled Raft example as production configuration. Updated the comment to describe it as HA Raft configuration without calling the exact snippet production-ready.
- The Vault ACL policy examples used `auth_kubernetes_*` as a wildcard mount accessor inside policy template expressions. Vault policy templating requires the exact auth mount accessor. Replaced those examples with explicit backend paths that match the role and application examples.
- The application command used `source` with `/bin/sh`, which is not portable POSIX shell syntax. Replaced it with `. /vault/secrets/db-creds && exec ./start-server`.
- The post referred to "Vault Operator" for internal configuration and automated unsealing, but HashiCorp's official Kubernetes operator is Vault Secrets Operator and the generic unseal workflow depends on the operator used. Reworded those references to "a Vault-focused Kubernetes operator."

## Review Notes
- The Kubernetes auth configuration example is valid for Vault running inside Kubernetes on supported Vault versions because Vault can use the local service account token and CA certificate when `token_reviewer_jwt` and `kubernetes_ca_cert` are omitted.
- The ServiceMonitor values are valid, but they require the Prometheus Operator CRDs to exist and Vault telemetry configuration to expose useful metrics.
- The Vault listener example disables TLS and should be adapted before production use.
