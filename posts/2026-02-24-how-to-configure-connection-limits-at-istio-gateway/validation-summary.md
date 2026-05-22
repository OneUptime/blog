# Validation Summary: How to Configure Connection Limits at Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy and EnvoyFilter
- Kubernetes
- DestinationRule connection pools
- Envoy local and global rate limiting
- Prometheus metrics and PrometheusRule alerts

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio istioctl install documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Envoy connection limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/connection_limit_filter
- Envoy connection limit proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/connection_limit/v3/connection_limit.proto
- Envoy HTTP connection manager proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy HTTP protocol options proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy HTTP local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy listener statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The first TCP example was described as limiting the total number of accepted TCP connections, but `per_connection_buffer_limit_bytes` and `connection_balance_config` do not set a connection count limit. Updated the wording to describe it as limiting per-connection memory before introducing the actual connection limit filter.
- The connection limit filter was described as a single gateway-wide cap. Envoy's connection limit network filter applies to connections processed by the selected proxy filter chain, so the text now says "each selected gateway proxy filter chain."
- The local rate limiting section was labeled and described as per-client rate limiting, but the shown `envoy.filters.http.local_ratelimit` token bucket is local to each gateway proxy instance, not per client. Renamed and reworded the section to local HTTP rate limiting.
- The HTTP filter insertion examples were missing an explicit `subFilter` match before `envoy.filters.http.router`. Added the `subFilter` match for the local and global HTTP filter examples to align with Istio EnvoyFilter guidance.
- The global rate limiting section deployed a rate limit service and ConfigMap but did not configure the gateway to call that service or attach route rate limit actions, so the limits would not be enforced. Added the required `envoy.filters.http.ratelimit` EnvoyFilter and virtual host `rate_limits` actions.
- The global client-IP rate limit claim did not mention trusted client address handling behind load balancers or proxies. Added a note to configure Istio gateway topology when needed.
- The monitoring examples used `envoy_server_total_connections` for active connections and a local rate limit metric name that did not match the configured `stat_prefix`. Updated the examples to use listener downstream connection metrics and the local rate limit metric generated from `gateway_rate_limit`.

## Review Notes
EnvoyFilter customizations depend on Envoy internals and should be re-tested during Istio upgrades. The global rate limit virtual host name is deployment-specific; the post now calls out that it must match the user's Gateway host and port.
