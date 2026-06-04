# Validation Summary: How to use Envoy routes for HTTP path-based routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Envoy HTTP route configuration
- Envoy route matching
- Envoy path, header, and query parameter matching
- Envoy traffic splitting, request mirroring, retries, timeouts, CORS, redirects, rate limit descriptors, and route statistics
- curl

## Sources Consulted
- Envoy route matching documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/route_matching
- Envoy HTTP route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy CORS v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Envoy HTTP connection manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy router filter statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter

## Issues Found
- The exact path matching section said exact matches take precedence over prefix matches. Envoy checks route entries in order, so I changed this to say exact matches take precedence when listed before overlapping prefix routes.
- Header match examples used the deprecated `exact_match` field. I changed them to `string_match.exact`, including the `:scheme` redirect matcher.
- The weighted cluster example used deprecated `total_weight`. I removed it because Envoy now uses the sum of cluster weights.
- The CORS example used the deprecated `cors` field directly on the virtual host. I changed it to `typed_per_filter_config` with `type.googleapis.com/envoy.extensions.filters.http.cors.v3.CorsPolicy` and noted that the CORS HTTP filter must be configured.
- The virtual host section said routing was based on Host header or SNI. Envoy virtual host route selection is based on the Host/`:authority` header, so I removed the SNI reference.
- The route metrics examples used unsupported Prometheus-style labels for route names. I changed them to Envoy per-route stat names rooted at `vhost.<virtual host>.route.<stat_prefix>` and noted that route `stat_prefix` is required.

## Review Notes
The snippets are route-focused fragments rather than complete Envoy bootstrap configurations. Rate limiting and CORS require the corresponding HTTP filters to be present in the HTTP connection manager filter chain.
