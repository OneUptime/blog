# Validation Summary: How to Configure Mesh-Wide Peer Authentication in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- PeerAuthentication
- Mutual TLS (mTLS)
- Kubernetes
- Envoy proxy metrics
- Prometheus
- Kiali

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio security concepts and authentication policy hierarchy: https://istio.io/latest/docs/concepts/security/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio `istioctl describe` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio secure Prometheus scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio MeshConfig reference for `rootNamespace`: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy listener TLS statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats

## Issues Found
- The Prometheus port-level exception example used port `15090`. Istio documents that `portLevelMtls` keys refer to workload ports, not Kubernetes Service ports, and `15090` is an Istio/Envoy telemetry port rather than a typical application metrics workload port. I changed the example to `9090` and added a clarification that the port must be the workload metrics port.

## Review Notes
The post focuses on sidecar-mode mTLS behavior. Istio's PeerAuthentication reference also documents ambient-mode behavior, including that `DISABLE` is not supported in ambient mode, but the article's examples and migration flow are consistent with sidecar-mode usage.
