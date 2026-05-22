# Validation Summary: How to Configure Envoy Proxy Retry Logic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy Proxy retry policies
- Kubernetes YAML resources
- istioctl
- Envoy admin stats
- Prometheus queries

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy router filter retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy route RetryPolicy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post said Istio's default retry condition includes `retriable-status-codes`. Istio's current VirtualService reference documents the default as `connect-failure,refused-stream,unavailable,cancelled`, so the default behavior section was corrected.
- The basic retry example included `retriable-status-codes` without defining any retriable status codes or relying on the required request header. The example was simplified to `5xx,reset,connect-failure`.
- The practical retry condition example also included `retriable-status-codes` without status-code configuration. It was changed to Istio's documented practical default retry policies.
- The description of `retriable-status-codes` referred to a `retriable-status-codes` header. Envoy documents the request header as `x-envoy-retriable-status-codes`, so the header name was corrected.
- The retry backoff section used an EnvoyFilter example with camelCase Envoy route fields and implied EnvoyFilter was the normal way to customize backoff. Istio exposes `backoff` on `HTTPRetry`, so the example was replaced with a VirtualService `retries.backoff` example and the max-interval EnvoyFilter caveat was retained.
- The backoff explanation described deterministic doubling. Envoy documents a fully jittered exponential backoff algorithm, so the wording was corrected.
- The monitoring section mixed Envoy admin stat names with Prometheus metric names. The `/stats` examples now use `cluster.<cluster>.upstream_*` names, and the Prometheus query uses the Envoy-style cluster label.

## Review Notes
The remaining Istio `VirtualService`, `DestinationRule`, and `istioctl proxy-config route` examples match the current Istio API shape. The Prometheus metric names match Envoy cluster retry counters as exported with Envoy-style Prometheus names, but exact label names can vary by telemetry setup.
