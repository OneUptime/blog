# Validation Summary: How to Configure Security Policy Examples in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Istio EnvoyFilter
- Envoy HTTP connection manager local replies
- Kubernetes health checks

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio authorization dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio health checking of services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Envoy local reply modification documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/local_reply.html

## Issues Found
- The introduction described PeerAuthentication and AuthorizationPolicy as the two main security policy types and implied that every call is automatically authenticated and authorized. Updated this to include RequestAuthentication and to describe these resources as building blocks for authentication and authorization.
- The health-check section implied that a deny-all AuthorizationPolicy directly blocks Kubernetes kubelet probes and that allowing `/healthz` and `/readyz` fixes kubelet probing. Updated this to reflect Istio's default probe rewrite behavior and to scope the example to health endpoints reached through the mesh.
- The port-level mTLS section did not mention that `portLevelMtls` keys refer to workload ports, not Kubernetes Service ports. Added that clarification.
- The IP allow-list section did not distinguish source packet IP matching from original client IP matching behind proxies or load balancers. Added a note about using `remoteIpBlocks` with trusted proxy handling for original client IPs.
- The custom deny response EnvoyFilter was technically incorrect: it merged `shadow_rules_stat_prefix` into the RBAC filter, which changes shadow-rule stats and does not customize denial responses. Replaced it with an HTTP connection manager `local_reply_config` example that formats local Envoy replies, including RBAC denials, as JSON.

## Review Notes
The examples use current `security.istio.io/v1` APIs and parse as YAML. The dry-run annotation is still documented by Istio as experimental/alpha, so production use should account for that caveat.
