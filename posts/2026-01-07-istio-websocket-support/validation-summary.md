# Validation Summary: How to Handle WebSocket Connections in Istio

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Istio Gateway, VirtualService, DestinationRule, EnvoyFilter, and PeerAuthentication
- Envoy HTTP upgrades and timeout settings
- WebSocket protocol
- Kubernetes Services and Deployments
- Prometheus Operator ServiceMonitor
- PromQL and Envoy metrics

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The DestinationRule examples used deprecated `consistentHash.minimumRingSize`. Updated the examples to use `consistentHash.ringHash.minimumRingSize`, matching current Istio guidance.
- The sticky session explanation implied load balancing can move an active WebSocket connection mid-connection and that consistent hashing guarantees a client always reaches the same backend. Revised this to explain that active TCP connections are not rebalanced, and consistent hashing provides soft affinity while the endpoint set is stable.
- The VirtualService matched the `Upgrade` header with a case-sensitive exact match. Updated it to use a case-insensitive regex so valid `Upgrade: WebSocket` variants still match.
- The fallback `/ws` route was described as handling the initial connection before upgrade. Corrected the comment because the WebSocket opening request is the upgrade request; the fallback handles non-upgrade HTTP requests to the same path.
- Several comments said WebSocket requires HTTP/1.1. Adjusted them to refer specifically to Envoy's HTTP/1.1 WebSocket upgrade path and Envoy's documented HTTP/2 upstream limitation for upgrade headers.
- The ServiceMonitor referenced a `http-envoy-prom` Service port that the sample Service did not expose. Added the `http-envoy-prom` port targeting the Envoy metrics port, 15090, and clarified the ServiceMonitor requirement.

## Review Notes
- The YAML snippets were parsed successfully after edits.
- The examples still use Istio `networking.istio.io/v1beta1` APIs. Current Istio documentation commonly shows `networking.istio.io/v1`, but `v1beta1` remains widely supported; a future refresh could standardize examples on `v1`.
- `timeout: 0s` and disabled stream idle timeouts can be appropriate for long-lived WebSocket connections, but production deployments should pair them with application-level ping/pong or keepalive behavior and resource limits.
