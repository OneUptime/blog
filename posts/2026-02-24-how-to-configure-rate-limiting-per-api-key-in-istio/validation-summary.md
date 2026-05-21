# Validation Summary: How to Configure Rate Limiting per API Key in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy global rate limiting
- Envoy external rate limit service
- Redis
- Kubernetes ConfigMap and kubectl
- YAML configuration

## Sources Consulted
- Istio official documentation: Enabling Rate Limits using Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy official documentation: HTTP rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy official API reference: route rate limit actions, including request_headers, generic_key, and header_value_match: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy official API reference: cluster protocol options and deprecation notes: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- EnvoyProxy ratelimit official README: descriptor configuration, runtime file loading, and RUNTIME_WATCH_ROOT behavior: https://github.com/envoyproxy/ratelimit

## Issues Found
- The rate limit cluster snippet used deprecated Envoy cluster fields, `protocol_selection` and top-level `http2_protocol_options`. Updated it to use `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions` and explicit HTTP/2 configuration.
- The missing API key example used `request_headers` with `skip_if_absent: true` followed by `generic_key`, which would also apply the `no-api-key` generic descriptor to requests that do include an API key. Replaced it with `header_value_match` using `expect_match: false`, and changed the matching rate limit service descriptor from `generic_key` to `header_match`.
- The path-based example implied pure path matching while using the `:path` pseudo-header. Clarified that `:path` includes the query string and noted that wildcard descriptor values are needed if query strings should share the same limit.
- The dynamic update section said to set `RUNTIME_WATCH_ROOT: "true"` for direct file watching. The ratelimit service documentation states that direct updates inside the runtime config directory use `RUNTIME_WATCH_ROOT: "false"`, so the post was corrected.

## Review Notes
EnvoyFilter exposes Envoy internals and Istio warns that those details can change across upgrades. The post is technically valid after the corrections, but production users should still test EnvoyFilter patches against their exact Istio and proxy versions.
