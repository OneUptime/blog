# Validation Summary: How to Use Kustomization with Cluster-Scoped Resources in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kustomize
- Kubernetes cluster-scoped resources
- Kubernetes RBAC
- Kubernetes CRDs
- Kubernetes StorageClasses and Namespaces

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux `tree kustomization` CLI reference: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Flux `events` CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post said `targetNamespace` would incorrectly set a namespace on cluster-scoped resources. Flux documents `spec.targetNamespace` as configuring or overriding the Kustomize namespace for objects in the build, and the practical concern in this guide is avoiding unintended namespace overrides for namespaced resources when grouping cluster-scoped resources. Updated the comments and explanation to state that `targetNamespace` should be omitted for Kustomizations meant only for cluster-scoped resources.
- The mixed-scope RBAC example described a namespaced `RoleBinding` but used a cluster-scoped `ClusterRoleBinding`. Updated the example to use `kind: RoleBinding` with `metadata.namespace: monitoring`, which correctly demonstrates a namespaced binding to a ClusterRole.
- The verification command used `flux tree ks`, but the official Flux CLI reference documents the command as `flux tree kustomization`. Updated the command to the documented form.

## Review Notes
- The Flux CLI was not installed in the local environment, so CLI command validation was performed against the official Flux command reference.
- The `flux tree kustomization` command is documented by Flux as a preview command, so its output and behavior may change in future Flux releases.
