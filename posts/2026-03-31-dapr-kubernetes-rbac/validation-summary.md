# Validation Summary: How to Use Dapr with Kubernetes RBAC

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Kubernetes RBAC (Role-Based Access Control)
- Kubernetes CRDs (Custom Resource Definitions)
- Kubernetes ServiceAccounts
- Kubernetes Secrets

## Sources Consulted
- Dapr Resource Specs: https://docs.dapr.io/reference/resource-specs/
- Dapr Security Concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr mTLS Configuration: https://docs.dapr.io/operations/security/mtls/
- Kubernetes RBAC Documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Dapr HTTPEndpoint Spec: https://docs.dapr.io/reference/resource-specs/httpendpoints-schema/
- Dapr Resiliency Spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/

## Issues Found
1. **mTLS described as handling "authorization"**: The original text stated "Dapr mTLS handles app-to-app authorization, but Kubernetes RBAC secures the control plane." mTLS provides mutual authentication and encryption, not authorization. Authorization in Dapr is handled by separate access control policies (ACLs). Changed "authorization" to "authentication and encryption."

## Review Notes
- The post does not include the `httpendpoints` Dapr CRD resource in its RBAC examples. This is a valid Dapr CRD that could be included for completeness, but since the post is demonstrating example RBAC patterns rather than claiming exhaustive coverage, this is not an error.
- All Kubernetes RBAC YAML manifests use correct `apiVersion: rbac.authorization.k8s.io/v1`, correct `kind` values, and properly structured `rules`, `subjects`, and `roleRef` fields.
- The `dapr.io` API group and resource names (`components`, `subscriptions`, `resiliencies`, `configurations`) are all correct.
- The secret-restriction pattern using `resourceNames` in a Role is a valid and recommended Kubernetes RBAC approach.
- The ServiceAccount RoleBinding omits the `namespace` field in the `subjects` entry, which defaults to the RoleBinding's namespace — this is acceptable behavior.
