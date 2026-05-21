# Validation Summary: How to Handle Persistent Connections with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Services and Deployments
- Envoy sidecars
- gRPC and HTTP/2
- WebSockets
- TCP keepalive
- Prometheus metrics

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Sidecar reference for connection pool behavior: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio MeshConfig/ProxyConfig reference for drain settings and proxy annotations: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats

## Issues Found
- Corrected the general persistent-connection load balancing explanation. The original text implied all gRPC calls on a single channel go to one backend even when Istio is doing L7 processing. Istio can classify gRPC as HTTP/2 and route individual streams, while opaque TCP traffic is load-balanced at connection level.
- Clarified that gRPC per-request load balancing depends primarily on protocol classification by port name or Kubernetes `appProtocol`, not on the DestinationRule alone.
- Fixed the sample metric discussion. The original text described per-pod imbalance, but the shown `istio_requests_total` grouping was workload/revision-level, not pod-level. The post now notes that per-pod analysis needs a pod-level dimension or Envoy endpoint-level metrics.
- Corrected `maxConnections` semantics. The original text treated the setting as a service-wide total across application replicas. DestinationRule connection pool settings apply from an Envoy proxy to an upstream destination, so each sidecar needs capacity for the connections opened by its local workload, while the database must handle the aggregate total.
- Corrected the WebSocket timeout explanation. Istio VirtualService HTTP timeout is disabled by default; `timeout: 0s` is only needed when overriding a nonzero timeout.
- Clarified `idleTimeout` as an upstream pooled HTTP connection idle timeout rather than a direct WebSocket lifetime setting.
- Clarified that `maxRequestsPerConnection` recycles HTTP connections and does not drain arbitrary TCP or WebSocket connections.

## Review Notes
The YAML snippets use current Istio `networking.istio.io/v1` APIs and valid DestinationRule, VirtualService, Service, and Deployment field names. The Envoy metric names listed for active upstream connections, connection timeouts, and connection circuit breaker overflow match Envoy cluster statistics, but Istio deployments may need proxy stats inclusion settings before all Envoy metrics are emitted.
