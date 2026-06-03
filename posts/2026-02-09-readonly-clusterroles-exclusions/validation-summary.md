# Validation Summary: How to Build Custom ClusterRoles for Read-Only Cluster-Wide Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes RBAC
- ClusterRole, Role, ClusterRoleBinding, and RoleBinding resources
- kubectl authorization checks
- Kubernetes Service discovery resources

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes v1.33 Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes v1.36 fine-grained kubelet authorization announcement: https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/

## Issues Found
- The introduction said standard view roles grant access to everything. Kubernetes' default `view` ClusterRole grants read-only access to most namespace objects but does not allow viewing Secrets, roles, or role bindings. Updated the wording to say the default view role may grant more resources than a user needs.
- The ConfigMap example implied RBAC can grant broad ConfigMap access while excluding specific ConfigMaps, and used `verbs: []` as a deny rule. Kubernetes RBAC is additive and does not support deny rules. Updated the section to grant `get` only on named non-sensitive ConfigMaps and to show a separate sensitive ConfigMap role that is only useful if explicitly bound.
- Several examples used the deprecated core `endpoints` resource. Kubernetes v1.33+ deprecates the Endpoints API in favor of EndpointSlices. Replaced those examples with `discovery.k8s.io` `endpointslices`.
- The security exclusions listed `podsecuritypolicies`, which were removed from Kubernetes in v1.25. Replaced it with pod security admission configuration.
- The namespace-filtered example used a `ClusterRoleBinding` while describing namespace exclusions. A `ClusterRoleBinding` grants cluster-wide access, while a `RoleBinding` grants permissions only in its namespace. Updated the example to use a namespaced `RoleBinding` and removed the cluster-scoped resources from that filtered role.
- The namespace-filtered role combined core and `apps` API group resources in one rule. Split the rule into separate `apps` and core API group entries so each resource is clearly associated with the API group where it exists.

## Review Notes
- `kubectl` was not installed in the review environment, so command verification used the official Kubernetes documentation rather than local CLI help.
- The `kubectl auth can-i` examples use valid resource/subresource syntax such as `pods/log` and `pods/exec`.
