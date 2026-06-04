# Validation Summary: How to implement Envoy external authorization with ext_authz filter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Envoy HTTP ext_authz filter
- Envoy HTTP and gRPC external authorization services
- Envoy v3 xDS configuration
- Go net/http authorization service
- Envoy statistics and monitoring

## Sources Consulted
- Envoy External Authorization HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter.html
- Envoy ext_authz v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto.html
- Envoy external authorization service v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/auth/v3/external_auth.proto
- Envoy cluster v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy HTTP upstream protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The HTTP authorization service example returned `x-user-id` and `x-user-roles` inside a JSON response body. Envoy's HTTP ext_authz integration copies configured `allowed_upstream_headers` from the authorization service response headers, not from arbitrary JSON body fields, so the example was changed to set those headers on `http.ResponseWriter` before `WriteHeader`.
- The gRPC cluster example used the deprecated top-level `http2_protocol_options: {}` cluster field. It was updated to use `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions` and `explicit_http_config.http2_protocol_options`.
- The caching section showed `filter_enabled_metadata`, which controls whether the ext_authz filter is enabled and does not cache authorization decisions. The section was corrected to state that Envoy's ext_authz filter does not cache authorization decisions itself and that caching should be implemented in the authorization service.
- The monitoring example listed non-matching Prometheus metric names such as `envoy_http_ext_authz_total` and a cluster latency query with a `cluster` label. It was corrected to show the Envoy stat namespaces documented for ext_authz and cluster request latency.

## Review Notes
The snippets are partial Envoy configuration fragments rather than complete bootstrap files, so they require surrounding listener, HTTP connection manager, route, and admin configuration before they can be loaded directly by Envoy.
