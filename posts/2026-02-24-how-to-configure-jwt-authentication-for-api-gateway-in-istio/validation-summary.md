# Validation Summary: How to Configure JWT Authentication for API Gateway in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy ingress gateway
- JWT authentication
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio Gateway and VirtualService
- kubectl and istioctl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The public-route example used a separate `ALLOW` policy alongside a `DENY` policy. Istio evaluates `DENY` policies before `ALLOW` policies, and the presence of any `ALLOW` policy makes authorization an allow-list for that workload. This meant the public route example would not behave as described and could deny valid protected requests. I changed the example to exclude public paths with `notPaths` in the `DENY` rule instead.
- The complete setup repeated the same `ALLOW` policy issue. I removed the partial public `ALLOW` policy and changed the JWT requirement to a single `DENY` policy that applies to all paths except the public endpoints.
- After removing the separate public `ALLOW` resource from the complete manifest, I preserved the YAML document separator between `RequestAuthentication` and `AuthorizationPolicy` so the combined manifest remains valid multi-document YAML.
- The post overstated that every service needs its own `RequestAuthentication` policy. Istio supports workload-selected, namespace-scoped, and root-namespace policies, so I changed the wording to say that separate workload or namespace policies may be needed across services.

## Review Notes
- The post uses `security.istio.io/v1` and `networking.istio.io/v1`, which are current Istio APIs.
- Istio's documentation recommends scoping `DENY` policies carefully, especially when HTTP attributes are used on listeners that may also handle TCP traffic. The examples are HTTP gateway examples, so the path-based rules are appropriate for the tutorial context.
