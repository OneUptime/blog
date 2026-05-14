# Validation Summary: How to Configure Flux CD with Least Privilege RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes ServiceAccount impersonation
- Flux kustomize-controller
- Flux helm-controller
- Flux source-controller
- kubectl
- jq

## Sources Consulted
- Flux multi-tenancy and authorization model: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux Kustomization inventory and service account reference: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/
- Flux install manifests from the official fluxcd/flux2 release artifact: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/

## Issues Found
- The Kustomization inventory parsing command used `cut -d_ -f3`, which returns the API group field, not the Kubernetes kind. Changed it to `cut -d_ -f4` because Flux inventory IDs are formatted as `<namespace>_<name>_<group>_<kind>`.
- The sample controller ClusterRoles omitted `coordination.k8s.io` `leases` permissions, but the Flux install manifests run controllers with leader election enabled. Added lease permissions to the kustomize, helm, and source controller roles.
- The helm-controller role only had read access to `helmcharts`, but Flux creates and manages `HelmChart` resources when a `HelmRelease` uses a chart template. Added create, update, patch, and delete permissions for `helmcharts`, and added other supported source kinds used by Helm releases.
- The source-controller role used a wildcard resource rule while the post later advised avoiding wildcards. Replaced the wildcard with explicit Source Toolkit resources and their status/finalizer subresources.
- The source-controller role omitted permissions needed by current Flux source authentication and object-level workload identity patterns. Added read access for ConfigMaps and ServiceAccounts, plus `serviceaccounts/token` create permission.
- The post removed only `crd-controller-flux-system`, which would not remove the default cluster-admin binding for kustomize-controller and helm-controller in current Flux installs. Added removal of `cluster-reconciler` / `cluster-reconciler-flux-system`, and clarified that broad default bindings should only be removed after every installed controller has a scoped replacement.

## Review Notes
The examples are still intentionally workload-specific. Real clusters may need additional permissions for CRDs, Jobs, Ingresses, custom resources, or cluster-scoped objects managed by Flux. Flux's documented multi-tenancy model recommends constraining reconciliation with `.spec.serviceAccountName` and default service account flags, which should be considered alongside controller-level RBAC.
