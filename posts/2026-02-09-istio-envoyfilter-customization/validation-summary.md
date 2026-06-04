# Validation Summary: How to Use Istio EnvoyFilter for Advanced Proxy Customization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy Proxy HTTP filters
- Envoy Lua filter
- Envoy global rate limiting
- Envoy external authorization
- Envoy TLS configuration
- Istio Telemetry API
- Kubernetes and kubectl
- Istio VirtualService

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio customizing metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto.html
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy rate limit filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter.html
- Envoy external authorization filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto.html
- Envoy TLS common configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto.html
- Envoy config dump API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto

## Issues Found
- The Lua examples used the deprecated `inline_code` field and the older `envoy.lua` filter name. Updated them to `default_source_code.inline_string` and `envoy.filters.http.lua`.
- The rate limiting example inserted the global rate limit filter but did not configure route or virtual host rate limit actions, so it would not call the rate limit service for any route. Added a `VIRTUAL_HOST` patch with `rate_limits` actions and aligned the gateway workload selector and cluster name with Istio's documented pattern.
- The external authorization section implied EnvoyFilter was the normal path for custom external authorization. Added a note that Istio `AuthorizationPolicy` with `CUSTOM` action is preferred when it fits.
- The TLS example claimed TLS 1.3 cipher suites could be restricted with Envoy's `cipher_suites` field while listing TLS 1.2 cipher names. Removed the invalid cipher list and clarified that Envoy's `cipher_suites` setting only affects TLS 1.0 through TLS 1.2.
- The custom metrics example used an Envoy Wasm configuration that would not create a Prometheus counter as described. Replaced it with Istio's supported Telemetry API approach for adding an `api_version` label to `istio_requests_total`.
- The request/response Lua transformation attempted to read `:path` from response headers, where the request pseudo-header is not available. Updated the script to store request state in Lua dynamic metadata during request processing and read it during response processing.
- The debugging section used `config_dump?resource=filters`, which is not a valid config dump resource. Replaced it with the listener config dump, where filter chains can be inspected.

## Review Notes
The post remains an advanced EnvoyFilter guide, but several examples are intentionally sensitive to Istio and Envoy versions. Future updates should re-check EnvoyFilter patches during Istio upgrades because the API exposes internal Envoy configuration details that can change across releases.
