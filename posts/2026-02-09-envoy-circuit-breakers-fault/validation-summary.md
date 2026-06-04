# Validation Summary: How to implement Envoy circuit breakers for fault tolerance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy
- Envoy circuit breakers
- Envoy cluster configuration
- Envoy outlier detection
- Envoy retry policy
- Prometheus / PromQL

## Sources Consulted
- Envoy circuit breaking architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking.html
- Envoy circuit breakers v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto.html
- Envoy circuit breaker configuration reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy outlier detection v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy upstream HTTP protocol options v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy HTTP route retry policy v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The introduction implied that circuit breakers stop traffic when a service starts failing. Envoy circuit breakers are resource and concurrency limits, while failure-based host ejection is handled by outlier detection. Updated the wording to describe resource-limit back pressure.
- The threshold list said Envoy circuit breakers operate on four key thresholds and described `max_requests` as HTTP/2 and HTTP/3-specific. Envoy also supports `max_connection_pools`, and `max_requests` applies to HTTP traffic generally. Updated the threshold list.
- The post said every exceeded threshold immediately rejects requests with 503. Envoy can queue requests depending on which limit is reached, and HTTP requests that cannot be admitted are returned by the router as 503 with `x-envoy-overloaded`. Updated the statement.
- The connection pool example used deprecated top-level cluster `http2_protocol_options` and `common_http_protocol_options`. Replaced them with the current `typed_extension_protocol_options` form for `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The recovery section described circuit breakers as having gradual recovery after tripping. Envoy circuit breaker open/closed state is based on current resource usage and does not use a sleep window; gradual host reintroduction is an outlier detection behavior. Updated the wording.

## Review Notes
The Prometheus metric examples are plausible for Envoy's Prometheus output, but production queries usually add cluster labels such as `envoy_cluster_name` to avoid aggregating across clusters.
