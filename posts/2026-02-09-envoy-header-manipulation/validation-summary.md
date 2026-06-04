# Validation Summary: How to Use Envoy Header Manipulation for Request Transformation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Envoy Proxy
- Envoy HTTP connection manager
- Envoy route configuration
- Envoy request and response header manipulation
- Envoy substitution formatters
- Envoy CORS filter
- Envoy JWT authentication metadata
- Envoy rate limit filter
- curl

## Sources Consulted
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy RouteConfiguration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route.proto.html
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy HeaderValueOption API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto.html
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto.html
- Envoy CORS filter documentation and API reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter and https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Envoy rate limit filter documentation and API reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter.html and https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy JWT authentication filter documentation and API reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter.html and https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/jwt_authn/v3/config.proto.html
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html

## Issues Found
- Several examples placed `request_headers_to_add`, `request_headers_to_remove`, and `response_headers_to_add` inside `route`, which is a `RouteAction`. Moved those fields to the enclosing `Route` level, where Envoy defines route-level header mutation fields.
- Replaced deprecated `append: false` usage with `append_action: OVERWRITE_IF_EXISTS_OR_ADD` or `append_action: ADD_IF_ABSENT`.
- Corrected `X-Forwarded-Proto` to use `%REQ(:SCHEME)%` instead of `%PROTOCOL%`, since `%PROTOCOL%` returns the HTTP protocol version rather than the request scheme.
- Moved upstream formatter examples such as `%UPSTREAM_HOST%` from request headers to response headers, where upstream context is available.
- Corrected the timestamp formatter from `%START_TIME(... )%Z` to `%START_TIME(...%z)%`.
- Corrected the upstream service time header extraction to use `%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%`.
- Clarified the canary weighted cluster example so it no longer claims the split is based on a header hash.
- Corrected JWT dynamic metadata examples to include a configured `payload_in_metadata` key.
- Replaced deprecated route `cors` configuration with `typed_per_filter_config` for `envoy.filters.http.cors`, added the CORS HTTP filter, and replaced the invalid wildcard `prefix` matcher with a `safe_regex` matcher.
- Added the router filter to the rate limit filter chain snippet.
- Moved `max_request_headers_kb` from `common_http_protocol_options` to the HTTP connection manager level.
- Changed the admin `/logging` command to use `POST`, as Envoy admin mutations require POST.
- Removed the unsupported `headers_added|headers_removed` stats example.

## Review Notes
The snippets are still illustrative and omit some surrounding cluster/filter configuration in partial sections. The YAML snippets parse successfully, but full runtime validation would require an Envoy binary and complete runnable configs for every partial example.
