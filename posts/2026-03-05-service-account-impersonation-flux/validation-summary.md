# Validation Summary: How to Configure Service Account Impersonation in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The Kustomization example placed the Flux Kustomization in `flux-system` while creating the impersonated ServiceAccount in `webapp`. Flux resolves `spec.serviceAccountName` in the namespace of the Kustomization, so this would not impersonate `webapp/app-deployer`. Updated the Kustomization namespace to `webapp`, changed the source reference to a same-namespace `GitRepository`, and clarified the explanation.
- The HelmRelease example placed the HelmRelease in `flux-system` while referencing a ServiceAccount intended for the `cache` namespace. Updated the HelmRelease namespace and HelmRepository source reference to `cache` so `spec.serviceAccountName: cache-deployer` resolves correctly.
- The multi-tenant example placed the tenant Kustomization in `flux-system`, which would make `serviceAccountName: team-alpha-deployer` resolve in the wrong namespace. Updated the Kustomization and source reference to use the `team-alpha` namespace.
- The impersonation RBAC snippet comment mentioned only the kustomize-controller, but the binding also included helm-controller. Updated the comment to refer to Flux controllers.

## Review Notes
The examples assume the referenced namespaces and Flux source objects exist before reconciliation. If `--no-cross-namespace-refs=true` is enabled, Flux source objects should be created in the same namespace as the tenant Kustomization or HelmRelease, which the corrected examples now reflect.
