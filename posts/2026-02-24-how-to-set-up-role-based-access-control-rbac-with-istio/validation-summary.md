# Validation Summary: How to Set Up Role-Based Access Control (RBAC) with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio mutual TLS workload identity
- JWT claim-based authorization
- Kubernetes ServiceAccount
- Kubernetes Deployment pod service accounts
- kubectl exec
- Kiali

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio trust domain migration task, for SPIFFE identity format: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kiali topology documentation: https://kiali.io/docs/features/topology/
- Kiali Istio configuration documentation: https://kiali.io/docs/features/configuration/

## Issues Found
- The post described the workload identity as `cluster.local/ns/default/sa/backend-api`. That is the Istio authorization principal format, but the SPIFFE identity includes the URI scheme: `spiffe://cluster.local/ns/default/sa/backend-api`. Updated the sentence to distinguish the SPIFFE ID from the principal string used in `AuthorizationPolicy.source.principals`.
- The "complete" e-commerce example showed Backend API access to product catalog and order service in the diagram but did not include the corresponding `AuthorizationPolicy` resources. Added `backend-api-to-product-catalog` and `backend-api-to-order-service` policies.
- The order processor section said it could read orders and call the payment service, but the YAML only allowed calls to the payment service. Added an `order-processor-to-orders` policy for `GET` requests to `/orders/*`.

## Review Notes
- The post uses the current `security.istio.io/v1` API for `AuthorizationPolicy` and `RequestAuthentication`.
- The namespace-wide default deny pattern is valid: an allow policy with no matching rules denies traffic unless another allow policy matches.
- Source principal matching requires mTLS identity to be available. The post already discusses Istio-issued mTLS certificates before using service account principals.
- `RequestAuthentication` validates JWTs but allows requests without credentials unless paired with an authorization policy. The JWT examples correctly add `AuthorizationPolicy` resources that match JWT claims.
