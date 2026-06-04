# Validation Summary: How to Implement Cross-Namespace ServiceAccount Access with RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kubernetes ClusterRoles, Roles, ClusterRoleBindings, and RoleBindings
- Kubernetes NetworkPolicies
- Kubernetes EndpointSlices
- kubectl authorization checks
- Go client-go in-cluster configuration

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes Service and Endpoints documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- client-go package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes

## Issues Found
- The post stated that cross-namespace access requires ClusterRoles and ClusterRoleBindings. Kubernetes also supports granting a ServiceAccount from one namespace access within another namespace by using a RoleBinding in the target namespace, optionally referencing a reusable ClusterRole. Updated the wording to distinguish cluster-wide access from selective namespace access.
- The service discovery RBAC example used the deprecated core/v1 Endpoints resource. Kubernetes documentation now recommends EndpointSlices, and Endpoints is deprecated as of Kubernetes v1.33. Updated the rule to use `discovery.k8s.io` `endpointslices`.
- The NetworkPolicy example selected the monitoring namespace with `name: monitoring`, which is not a standard automatic namespace label. Updated it to use the Kubernetes-managed immutable namespace label `kubernetes.io/metadata.name: monitoring`.
- The conclusion repeated the over-broad ClusterRole requirement. Updated it to mention ClusterRoleBindings for cluster-wide access and namespace-scoped RoleBindings with Roles or reusable ClusterRoles for selective access.

## Review Notes
The `kubectl auth can-i` examples match the official command reference, including `--all-namespaces`, `--as`, `--list`, and `-n`. The Go client-go example uses current package paths and the current `List(context.Context, metav1.ListOptions)` style. The broad Secret access and tenant-admin examples are technically valid RBAC patterns, but they should be reviewed carefully in real clusters because they carry significant privilege-escalation risk.
