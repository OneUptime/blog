# Validation Summary: How to Configure SecretStore for HashiCorp Vault with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- HashiCorp Vault
- Vault Kubernetes auth method
- Vault token auth
- Vault AppRole auth
- Kubernetes SecretStore and ExternalSecret resources
- Flux CD Kustomization
- Kubernetes CLI and Vault CLI

## Sources Consulted
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth method API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated the `SecretStore` and `ExternalSecret` examples to the current `external-secrets.io/v1` API shown in the latest official ESO documentation.
- The Vault Kubernetes auth configuration read the Kubernetes API endpoint from the in-cluster `kubernetes` Service and the CA certificate from `/var/run/secrets/...`, which only works from the right in-cluster context. Replaced this with `kubectl config view --raw --minify --flatten` so the command works from the documented prerequisite of a local `kubectl` context.
- The Kubernetes auth example omitted the TokenReview RBAC needed when Vault uses the client ServiceAccount token as the reviewer token. Added a `system:auth-delegator` ClusterRoleBinding for the `external-secrets` ServiceAccount, matching the ESO and Vault guidance.
- The Vault role used deprecated `policies` and legacy `ttl` parameters. Updated them to `token_policies` and `token_ttl`, and added an explicit `audience` because current ESO documentation notes Vault 1.21 and later require role audiences.
- The ESO Kubernetes auth `serviceAccountRef` did not request the audience configured on the Vault role. Added `audiences: ["vault"]` to keep the ServiceAccount token and Vault role aligned.
- The token and AppRole examples referenced Secrets in `external-secrets` while using namespaced `SecretStore` resources in `default`. Updated the token Secret namespace to `default` and removed cross-namespace Secret refs so the examples match namespaced `SecretStore` behavior.

## Review Notes
- The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `sourceRef`, `path`, `prune`, `interval`, and `dependsOn` fields.
- The Vault KV v2 policy paths and ExternalSecret `remoteRef.key` usage are consistent with ESO's Vault provider documentation.
- The `caBundle` placeholder is structurally correct as a base64-encoded CA bundle placeholder, but a real deployment should replace it with the actual PEM bundle encoded as expected by the Kubernetes API.
