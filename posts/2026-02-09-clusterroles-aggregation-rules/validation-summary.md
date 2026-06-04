# Validation Summary: How to Configure ClusterRoles with Aggregation Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes RBAC
- ClusterRoles
- Aggregated ClusterRoles
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API reference: ClusterRole v1 - https://kubernetes.io/docs/reference/kubernetes-api/rbac/cluster-role-v1/
- Kubernetes kubectl reference: kubectl apply - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post said only the built-in `view` and `edit` roles would include the custom permissions from the examples. The `rbac-extend-edit.yaml` example also labels the role with `rbac.authorization.k8s.io/aggregate-to-admin: "true"`, so the built-in `admin` role is extended as well. Updated the sentence to mention `view`, `edit`, and `admin`.
- The `monitoring-config` example used `resourceNames` with `get`, `list`, and `watch`. Kubernetes allows `resourceNames`, but list/watch requests restricted by resource name require a matching `metadata.name` field selector, which the post did not show. Updated the example to use `get` only so the shown permission works as described without additional command constraints.

## Review Notes
The aggregation examples use the current `rbac.authorization.k8s.io/v1` API and valid `aggregationRule.clusterRoleSelectors` syntax. Multiple selectors are valid and are combined as an OR match; multiple `matchExpressions` inside one selector are combined by the selector semantics. The `kubectl apply -f -` examples are valid for applying manifests from standard input.
