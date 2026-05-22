# Validation Summary: How to Allow Only Internal Traffic to a Service in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Istio Gateway and VirtualService
- Kubernetes Services, pods, and kubectl
- Prometheus alerting for Istio metrics

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio security concepts, mutual TLS dependency for authorization fields: https://istio.io/latest/docs/concepts/security/
- Istio Explicit Deny authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Secure Ingress task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The AuthorizationPolicy examples used `principals: ["cluster.local/ns/*/sa/*"]`. Istio authorization string fields support exact, prefix, suffix, and presence matches, not glob matching in the middle of a string. I changed these examples to `principals: ["cluster.local/ns/*"]`, which is a valid prefix match for principals in the local `cluster.local` trust domain.
- The explanatory text described `cluster.local/ns/*/sa/*` as the principal format. I updated it to describe `cluster.local/ns/*` as a prefix match for local trust-domain workload identities.

## Review Notes
- The post correctly recommends STRICT PeerAuthentication when using source principal or namespace authorization fields, because those fields require mTLS and Istio strongly recommends STRICT mode to avoid plaintext traffic policy surprises.
- The ingress gateway principal shown is valid for Istio's commonly documented default ingress gateway service account, but gateway service account names can vary by installation method. Operators should verify the actual gateway workload identity in their cluster before applying an exact-principal DENY rule.
