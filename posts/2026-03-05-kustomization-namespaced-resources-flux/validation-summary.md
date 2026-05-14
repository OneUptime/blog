# Validation Summary: How to Use Kustomization with Namespaced Resources in Flux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux CLI
- Kubernetes namespaces
- Kubernetes RBAC
- Kustomize
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux tree kustomization` reference: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Kubernetes namespace documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The namespace precedence section incorrectly stated that resources without any namespace default to the Flux controller namespace, typically `flux-system`. Kubernetes uses the `default` namespace for objects with no other namespace, so this was corrected.
- The namespace creation section stated only that Flux does not automatically create the target namespace. Flux documentation also notes that the namespace may be defined by a manifest included in the same Kustomization, so this caveat was added.
- The Kustomize namespace transformer comment said it sets the namespace on all resources. This was narrowed to namespaced resources to avoid implying cluster-scoped resources are namespaced.
- The verification command used `flux tree ks`. The current official Flux CLI documentation lists `flux tree kustomization`, so the command was changed to the documented form.

## Review Notes
The examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields such as `targetNamespace`, `dependsOn`, `wait`, `serviceAccountName`, `sourceRef`, `path`, and `prune`. The RBAC example is technically valid because the ServiceAccount lives in the same namespace as the Flux Kustomization and is bound into the tenant namespace, though Flux's multi-tenancy documentation commonly shows tenant Kustomizations and their ServiceAccounts in the tenant namespace.
