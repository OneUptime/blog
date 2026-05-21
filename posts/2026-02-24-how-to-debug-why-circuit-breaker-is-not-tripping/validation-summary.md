# Validation Summary: How to Debug Why Circuit Breaker is Not Tripping

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio DestinationRule
- Istio circuit breaking
- Envoy circuit breakers and outlier detection
- Kubernetes
- istioctl
- Fortio

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy circuit breaker API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The DestinationRule example used `networking.istio.io/v1beta1`. Updated it to the current stable `networking.istio.io/v1` API used by current Istio documentation.
- The post described `http2MaxRequests` as only a concurrent HTTP/2 request limit. Updated the text to clarify that Istio documents it as the maximum active requests to a destination and that it applies to both HTTP/1.1 and HTTP/2.
- The post stated that HTTP/2 is the default for Istio mesh traffic. Reworded this to reference cases where HTTP/2 is actually used, such as gRPC, explicit `http2` service ports, or configured HTTP/2 upgrades.
- The Envoy circuit breaker stats list omitted `upstream_rq_active_overflow`, which is the counter for the active request circuit breaker. Added it to the grep and metric list.
- The outlier detection stats used deprecated Envoy counters (`ejections_total` and `ejections_consecutive_5xx`). Replaced them with the current enforced ejection counters.
- The post said connection pool limits are per endpoint by default. Corrected this to explain that the circuit breaker limits are scoped to each client proxy's Envoy upstream cluster, not globally across the service.
- The post said outlier-ejected endpoints show as `UNHEALTHY`. Corrected this to `FAILED` in the `OUTLIER CHECK` column, matching Istio endpoint output.

## Review Notes
The Fortio sample manifest URL returned HTTP 200 for the referenced Istio release branch. Some example commands depend on local workload names, container names, and stats inclusion settings in the user's mesh, but the command forms and referenced fields are technically valid.
