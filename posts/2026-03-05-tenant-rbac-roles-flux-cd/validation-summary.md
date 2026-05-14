# Validation Summary: How to Configure Tenant RBAC Roles in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kubernetes Role, RoleBinding, and ClusterRole resources
- kubectl
- GitOps multi-tenancy

## Sources Consulted
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux create tenant` documentation: https://fluxcd.io/flux/cmd/flux_create_tenant/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC good practices documentation: https://kubernetes.io/docs/concepts/security/rbac-good-practices/
- Kubernetes `kubectl auth can-i` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post described the default `cluster-admin` RoleBinding as giving control over "all resources in their namespace." Kubernetes documents that `cluster-admin` in a RoleBinding grants full control over resources in the RoleBinding namespace, so I clarified this as "namespaced resources" to avoid implying cluster-scoped access.
- The post said a tenant with namespace-scoped `cluster-admin` can create "any resource type." I changed this to "any namespaced resource type" because RoleBindings do not grant cluster-scoped resource permissions.
- The post said excluding RBAC resources "prevents privilege escalation." Kubernetes documents that workload creation and Secret access can also be privilege-escalation paths, so I changed the wording to say it removes one common privilege-escalation path through RBAC changes.
- The Common Pitfalls section said granting `roles` and `rolebindings` access "allows privilege escalation." I changed this to "can allow privilege escalation" for technical precision.

## Review Notes
The YAML examples use the current `rbac.authorization.k8s.io/v1` API and valid Kubernetes RBAC resource shapes. The `kubectl auth can-i` examples use valid flags and impersonation syntax. The Flux `serviceAccountName` explanation matches Flux documentation for Kustomization reconciliation impersonation. The `flux create tenant` command is officially documented but marked by Flux as preview and under development, so future CLI behavior may change.
