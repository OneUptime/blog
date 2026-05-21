# Validation Summary: How to Handle Service-to-Service Security in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes service accounts
- Istio mutual TLS and PeerAuthentication
- Istio AuthorizationPolicy
- Istio Telemetry API and Envoy access logs
- istioctl and kubectl commands

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security FAQ: https://istio.io/latest/about/faq/security/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The post implied Istio provides mTLS between all services. Updated this to "meshed workloads" because Istio mTLS applies to workloads participating in the mesh.
- The mesh-wide PeerAuthentication text assumed `istio-system` universally and said every service must use mTLS. Updated it to refer to the Istio root namespace, commonly `istio-system`, and to inbound traffic for meshed workloads.
- The `ssl.handshake` stats check was described as directly confirming mTLS. Updated it to say the counter confirms TLS handshakes and should be used together with PeerAuthentication and `istioctl x describe` output to confirm mTLS enforcement.
- The access logging section claimed default logs include `upstream_peer_identity` and `downstream_peer_identity`. Updated it to match Istio's documented default access log fields and noted that peer URI SAN values require custom Envoy access log formatting.

## Review Notes
The examples use current Istio `security.istio.io/v1` and `telemetry.istio.io/v1` APIs. AuthorizationPolicy examples are valid, but in production the exact path matching behavior and policy interactions should be tested before rollout, especially when multiple ALLOW, DENY, or CUSTOM policies apply to the same workload.
