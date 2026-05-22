# Validation Summary: How to Add Custom HTTP Filters with EnvoyFilter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP filters
- Envoy Lua filter
- Envoy compressor filter
- Envoy CORS filter
- Envoy local rate limit filter
- Kubernetes custom resources
- istioctl proxy-config

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy compressor HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/compressor_filter
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy CORS v3 proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Envoy local rate limit HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy regex matcher v3 proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/regex.proto

## Issues Found
- The response header section incorrectly suggested the header-to-metadata filter could be used to add or modify response headers. I removed that reference because the documented purpose of header-to-metadata is to populate dynamic metadata from headers, while the example uses Lua for header mutation.
- The CORS example inserted another `envoy.filters.http.cors` filter even though the post already describes CORS as part of Istio's default HTTP filter chain. I changed the example to merge a `CorsPolicy` into the virtual host's `typed_per_filter_config`, which matches Envoy's documented requirement for CORS policy configuration.
- The CORS `safe_regex` matcher omitted `google_re2: {}`. I added it because Envoy's v3 regex matcher requires the RE2 engine configuration along with the regex string.
- The Lua limitations section said Lua filters cannot make external HTTP calls. I corrected this because Envoy Lua supports `httpCall()` to configured clusters, while noting that authorization decisions should use `ext_authz`.
- The Lua limitations section said Lua errors can crash the filter chain. I softened this to say script errors fail the affected stream, avoiding an overstatement about crashing the filter chain.

## Review Notes
The examples use EnvoyFilter, which Istio documents as exposing internal implementation details that can change across upgrades. The post's general advice to keep custom filters minimal and verify with `istioctl proxy-config` is appropriate.
