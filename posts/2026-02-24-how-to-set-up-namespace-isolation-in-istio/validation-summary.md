# Validation Summary: How to Set Up Namespace Isolation in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio Sidecar resources
- Istio mTLS and Auto mTLS
- Istio Prometheus metrics
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authorization policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts and allow-nothing / deny-all examples: https://istio.io/latest/docs/concepts/security/
- Istio TLS configuration and Auto mTLS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post implied Istio's default state is simply mTLS encryption between all services. Updated this to clarify that inbound sidecars are permissive by default while Auto mTLS uses mTLS for mesh-to-mesh traffic when possible.
- The strict mTLS section said PeerAuthentication ensures all traffic "in and out" of a namespace uses mTLS. Updated this because PeerAuthentication controls what inbound traffic workloads accept; outbound TLS origination is handled separately by Istio client-side behavior and DestinationRules.
- The allow-nothing AuthorizationPolicy examples were named `deny-all`, which could be confused with Istio's explicit `DENY` policy pattern. Renamed the examples to `allow-nothing` while preserving the deny-by-default behavior used by the tutorial.
- The health check section claimed kubelet probes are blocked by the deny-by-default policy. Updated it to account for Istio's default probe rewrite behavior, and framed the allow policy as needed when probe rewriting is disabled or health endpoints are exposed through normal mesh traffic.
- The monitoring scrape section used Istio's default telemetry port 15020 in an AuthorizationPolicy example, which could imply that normal Istio RBAC protects that plain-text telemetry endpoint. Updated the example to use an application metrics endpoint and added a note to protect direct 15020 scraping with Istio's secure metrics pattern or NetworkPolicy.
- The Sidecar section implied Sidecar host scoping prevents sidecars from knowing about or reaching other namespaces as an enforcement mechanism. Updated it to clarify that Sidecar limits received Istio service configuration and improves scalability, but does not by itself enforce outbound blocking.
- The NetworkPolicy section claimed it protects even when using `hostNetwork: true`. Updated this because Kubernetes documents `hostNetwork` behavior as plugin-dependent, and many implementations treat that traffic as node traffic rather than ordinary pod traffic.

## Review Notes
The examples use current `security.istio.io/v1`, `networking.istio.io/v1`, and `networking.k8s.io/v1` APIs. The policies assume sidecar mode and mTLS-derived source identities; ambient-mode deployments and waypoint-targeted policies may need different scoping.
