# Validation Summary: How to Use Envoy Filters

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Envoy Proxy
- Envoy listener filters
- Envoy network filters
- Envoy HTTP filters
- Envoy v3 configuration YAML
- JWT authentication
- CORS
- Local and global rate limiting
- Lua HTTP filters
- External authorization
- Response compression

## Sources Consulted
- Envoy HTTP connection manager architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_connection_management
- Envoy HTTP/3 overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http3
- Envoy HTTP filters and filter ordering: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_filters
- Envoy HTTP inspector listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/http_inspector
- Envoy CORS filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Envoy route components API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy compressor filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/compressor/v3/compressor.proto
- Envoy JWT authentication filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter
- Envoy local rate limit filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy external authorization filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto
- Envoy examples repository: https://github.com/envoyproxy/examples

## Issues Found
- The HTTP Connection Manager section implied that the TCP/TLS listener example handled HTTP/3 directly. Updated the wording to clarify that the shown TCP/TLS configuration handles HTTP/1.1 and HTTP/2, while HTTP/3 requires Envoy QUIC/UDP listener support.
- The HTTP/2 protocol options comment incorrectly described downstream `http2_protocol_options` on the HTTP Connection Manager as enabling upstream HTTP/2. Updated the comment to identify it as downstream HTTP/2 settings.
- The Router filter was described as unconditionally mandatory. Updated the wording to match Envoy's terminal-filter model: for upstream proxying, the Router filter is the typical terminal filter and must be last.
- Several CORS examples used the deprecated route/virtual-host `cors` field. Replaced them with `typed_per_filter_config` using `envoy.extensions.filters.http.cors.v3.CorsPolicy`.
- The public CORS example used `exact: "*"` with `allow_origin_string_match`, which matches a literal origin string rather than any origin. Replaced it with a safe regex matcher.
- The compressor example repeated `disable_on_etag_header` where it intended to remove `Accept-Encoding` before forwarding upstream. Changed the second field to `remove_accept_encoding_header`.
- The Envoy examples repository link returned 404. Updated it to the active `https://github.com/envoyproxy/examples` repository.

## Review Notes
- All 20 fenced YAML snippets parse successfully as YAML after the fixes. The snippets remain illustrative and many are partial Envoy configurations that require the referenced clusters, certificates, services, and external authorization/rate-limit services to exist in a real deployment.
