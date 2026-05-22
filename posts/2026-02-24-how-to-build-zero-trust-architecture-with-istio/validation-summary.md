# Validation Summary: How to Build Zero-Trust Architecture with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio security
- Istio mutual TLS
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio DestinationRule
- Istio Telemetry API
- Kubernetes ServiceAccounts
- Kubernetes NetworkPolicy
- kubectl and istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts and authorization behavior: https://istio.io/latest/docs/concepts/security/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio diagnostic guide for `istioctl x describe pod`: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio command reference for `istioctl analyze` and authorization diagnostics: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio SPIFFE identity documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The mTLS verification commands used `istioctl proxy-config endpoints` and said to look for `STRICT`. Istio's endpoint output is not the documented way to verify strict mTLS. Changed the examples to use `istioctl x describe pod`, which Istio documents for confirming that a pod enforces mTLS and clients speak mTLS.
- The default-deny policy was named `deny-all` and commented as "Deny all traffic" while the YAML was actually an ALLOW policy with no rules. That is the correct default-deny pattern, but it is not the same as an explicit DENY-all policy. Renamed it to `allow-nothing` and clarified the comment.
- The product-service policy comment said "Order and notification services" even though the allowed principals were `frontend` and `order-service`. Updated the comment to match the policy.

## Review Notes
The article assumes sidecar mode and the default Istio trust domain `cluster.local`. In ambient mode, waypoint-specific authorization policy targeting can differ, and a custom trust domain would change the principal strings. The examples remain technically valid for a conventional sidecar-based Istio mesh using the default trust domain.
