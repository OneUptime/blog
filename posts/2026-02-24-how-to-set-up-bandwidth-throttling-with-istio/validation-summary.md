# Validation Summary: How to Set Up Bandwidth Throttling with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- EnvoyFilter
- Kubernetes
- Prometheus
- curl

## Sources Consulted
- Envoy HTTP bandwidth limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/bandwidth_limit_filter
- Envoy bandwidth limit v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/bandwidth_limit/v3/bandwidth_limit.proto
- Envoy route components v3 API reference for `typed_per_filter_config`: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metrics reference: https://istio.io/latest/docs/reference/config/telemetry/

## Issues Found
- Corrected the unit explanation for Envoy `limit_kbps`. Envoy defines this field in KiB/s, not kilobits per second, so `limit_kbps: 1024` is approximately 1 MiB/s rather than 128 KB/s.
- Corrected claims that the bandwidth limit is per connection. Envoy's bandwidth limit token bucket is local to an Envoy process, and aggregate throughput can exceed the configured value across multiple pods or gateway replicas.
- Corrected the example Envoy stats names. The bandwidth limit filter exposes stats under `<stat_prefix>.http_bandwidth_limit.*`.
- Corrected the Istio telemetry example for HTTP traffic to use the HTTP response-size histogram sum rather than the TCP-only `istio_tcp_sent_bytes_total` metric.
- Reworded the long-lived stream note to avoid implying WebSocket coverage where HTTP filter behavior can depend on upgrade handling.

## Review Notes
- The EnvoyFilter examples use Envoy internals through Istio's EnvoyFilter API. Istio documents that EnvoyFilter patches are tied to Envoy xDS details and should be checked during proxy upgrades.
- The per-route example assumes a route named `video-stream` exists in the generated Envoy route configuration.
