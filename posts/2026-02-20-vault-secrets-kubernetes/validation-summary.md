# Validation Summary: How to Use HashiCorp Vault for Kubernetes Secrets Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Vault Agent Injector
- Vault Helm chart
- Vault Kubernetes authentication method
- Vault KV v2 secrets engine
- Kubernetes Secrets
- Kubernetes Deployments and ServiceAccounts
- Helm

## Sources Consulted
- HashiCorp Vault Agent Injector installation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector examples: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/examples
- HashiCorp Vault Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Agent templates and secret renewal behavior: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/platform/k8s/helm/configuration
- HashiCorp Vault HA with integrated storage (Raft): https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/ha-with-raft
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- OneUptime website: https://oneuptime.com/

## Issues Found
- The Helm values enabled TLS on the Vault TCP listener with `tls_disable = 0` but did not provide TLS certificate and key files. Changed the example listener to `tls_disable = 1` so the sample matches the rest of the non-TLS tutorial.
- The HA Raft initialization flow only unsealed `vault-0`. Added Raft join and unseal commands for `vault-1` and `vault-2`, matching HashiCorp's HA Raft workflow.
- The Kubernetes auth setup omitted TokenReview RBAC for Vault's Kubernetes ServiceAccount. Added a `system:auth-delegator` ClusterRoleBinding for the `vault` ServiceAccount in the `vault` namespace.
- The application container used `source` under `/bin/sh`, which is not portable POSIX shell syntax. Changed it to `. /vault/secrets/db-creds`.
- The secret rotation section described KV v2 static secrets as being refreshed before TTL expiry and used cache annotations for refresh behavior. Reworded it to describe Vault Agent template re-rendering for non-leased KV v2 secrets and changed the annotation to `vault.hashicorp.com/template-static-secret-render-interval`.
- The Mermaid flowchart subgraph titles used ambiguous syntax with spaces and hyphens. Updated the subgraphs to use explicit IDs and quoted labels.

## Review Notes
- The post remains a high-level tutorial. For a production deployment, readers would still need to add TLS configuration, audit device configuration, persistent storage sizing, namespace creation, and backup/unseal strategy details.
