# Validation Summary: How to Set Up Flux Multi-Tenancy with Workspace Isolation and RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- GitOps
- Kubernetes
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- GitHub bootstrap workflow

## Sources Consulted
- Flux multi-tenancy lockdown documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API reference v1: https://v2-6.docs.fluxcd.io/flux/components/source/api/v1/
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/

## Issues Found
- Removed `validation: client` from the Flux `Kustomization` example because the current `kustomize.toolkit.fluxcd.io/v1` API does not include that field.
- Replaced the recommendation to enable `validation: client` with a recommendation to validate manifests in CI, which aligns with current Flux guidance for catching manifest issues before reconciliation.
- Removed the RBAC rule that attempted to deny `clusterroles` and `clusterrolebindings` with `verbs: []`. Kubernetes RBAC permissions are additive and do not support deny rules, so this rule did not enforce the stated behavior.
- Updated NetworkPolicy namespace selectors to use the standard `kubernetes.io/metadata.name` namespace label instead of assuming a custom `name` label exists.
- Changed the NetworkPolicy HTTPS egress example from `namespaceSelector: {}` to `ipBlock: 0.0.0.0/0`. An empty namespace selector selects all namespaces, not the public internet.

## Review Notes
The examples are valid as tutorial scaffolding, but production multi-tenancy should also consider Flux controller lockdown flags such as `--no-cross-namespace-refs`, `--no-remote-bases`, and `--default-service-account`, plus admission policy controls for cluster-scoped resources.
