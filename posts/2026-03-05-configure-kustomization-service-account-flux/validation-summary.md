# Validation Summary: How to Configure Kustomization Service Account in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomize Controller
- Flux Kustomization API
- Kubernetes ServiceAccounts
- Kubernetes RBAC Roles and RoleBindings
- Kubernetes impersonation
- kubectl authorization checks

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize Controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes User Impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl auth can-i documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The Security Considerations section stated that `serviceAccountName` "prevents privilege escalation" and that tenants cannot create ClusterRoles or modify RBAC. This was too absolute. I changed it to say that the pattern reduces privilege escalation risk unless RBAC permissions are explicitly granted, and added a caveat that Secrets access or more privileged service accounts in the same namespace can still create escalation paths.

## Review Notes
- The Flux Kustomization examples use the current `kustomize.toolkit.fluxcd.io/v1` API and the documented `spec.serviceAccountName` field.
- The RBAC and `kubectl auth can-i --as=system:serviceaccount:<namespace>:<name>` examples are consistent with Kubernetes documentation.
- The combined Role example that lists resources from multiple API groups is accepted by Kubernetes RBAC, but future revisions could make it clearer by splitting rules by API group as shown earlier in the post.
