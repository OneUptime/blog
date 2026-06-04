# Validation Summary: How to Configure Envoy Connection Pooling for Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy
- Envoy upstream clusters
- HTTP/1.1 and HTTP/2 connection pooling
- TCP proxying
- Envoy circuit breakers
- Envoy admin statistics
- Prometheus / Grafana queries
- Python requests

## Sources Consulted
- Envoy Cluster configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy Circuit breakers API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy HTTP Protocol Options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy core protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Envoy cluster manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Envoy circuit breaking reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers
- Envoy overload manager reference, for distinguishing overload headers from circuit breaking: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/overload_manager

## Issues Found
- Replaced deprecated top-level cluster HTTP protocol fields (`common_http_protocol_options` and `http_protocol_options`) with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- Removed `headers_with_underscores_action` from upstream cluster HTTP options because Envoy documents that it only affects client request headers and has no impact when added to cluster config.
- Removed the unsupported HTTP/2 `allow_metadata` field and replaced deprecated `stream_error_on_invalid_http_messaging` with `override_stream_error_on_invalid_http_message`.
- Moved HTTP/2 common protocol settings into the non-deprecated HTTP protocol options extension.
- Removed unsupported `max_pending_requests` from `per_host_thresholds`; Envoy currently supports only `max_connections` for per-host circuit breaker limits.
- Removed `drain_connections_on_host_removal`, which is not a valid Envoy cluster field.
- Corrected preconnect wording to note that Envoy preconnects only when the cluster is healthy and already has traffic, rather than always pre-establishing connections before any demand.
- Corrected the Prometheus utilization example to use `remaining_cx` with `track_remaining: true` instead of dividing by the `cx_open` circuit-breaker-open gauge.
- Replaced deprecated `track_timeout_budgets` with `track_cluster_stats.timeout_budgets`.
- Corrected the Python circuit breaker fallback example by removing the inaccurate `x-envoy-overloaded` check and adding the missing fallback helper functions.
- Reworded the TCP proxy section to describe TCP connection limiting via circuit breakers instead of implying HTTP-style request connection pooling for non-HTTP TCP traffic.
- Qualified the HTTP/2 concurrency claim to note that upstream negotiated limits can lower the effective `max_concurrent_streams`.

## Review Notes
The examples are version-sensitive because Envoy is actively moving cluster HTTP protocol settings into `typed_extension_protocol_options`. The updated snippets use the current v3 configuration shape from the latest official Envoy documentation.
