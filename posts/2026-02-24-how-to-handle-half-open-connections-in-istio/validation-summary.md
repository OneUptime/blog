# Validation Summary: How to Handle Half-Open Connections in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- TCP keepalive
- Kubernetes
- AWS NAT Gateway
- Prometheus metrics

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio hardened Docker images documentation: https://istio.io/latest/docs/ops/configuration/security/harden-docker-images/
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- AWS NAT Gateway troubleshooting documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html
- RFC 9293, Transmission Control Protocol: https://datatracker.ietf.org/doc/html/rfc9293
- RFC 1122, TCP Keep-Alives: https://datatracker.ietf.org/doc/html/rfc1122

## Issues Found
- The original detection and monitoring commands assumed that `upstream_cx_*` and `upstream_rq_timeout` Envoy stats are always available. Istio records a minimal stat set by default, so I added a note that these stats may require `proxyStatsMatcher`.
- The original OS-level `ss` example assumed the `istio-proxy` container includes debugging tools. I added a note that distroless proxy images require an ephemeral debug container for tools like `ss`.

## Review Notes
The Istio API fields in the YAML examples are current in `networking.istio.io/v1`, including `tcpKeepalive`, `connectTimeout`, `idleTimeout`, `maxRequestsPerConnection`, `outlierDetection`, and HTTP route `timeout`. The AWS NAT Gateway 350-second idle timeout claim is still accurate, with AWS documenting that timed-out connections receive an RST only when resources attempt to continue using the connection.
