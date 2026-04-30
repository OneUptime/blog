# Validation Summary: How to Configure gRPC-Web with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC-Web
- Envoy Proxy
- Nginx
- IPv6
- JavaScript
- TypeScript
- `curl`
- `grpcurl`
- OneUptime monitoring

## Sources Consulted
- Envoy gRPC-Web filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Envoy CORS filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy CORS proto docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Envoy route components proto docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy HTTP protocol options docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy cluster proto docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy v1.24 deprecations: https://www.envoyproxy.io/docs/envoy/latest/version_history/v1.24/v1.24.0.html
- Envoy v1.17 deprecations: https://www.envoyproxy.io/docs/envoy/latest/version_history/v1.17/v1.17.0
- gRPC-Web docs and TypeScript support: https://github.com/grpc/grpc-web
- gRPC-Web protocol spec: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
- Nginx `ngx_http_grpc_module` docs: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Nginx `ngx_http_v2_module` docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ticket on grpc-web support: https://trac.nginx.org/nginx/ticket/1536
- `curl` manual: https://curl.se/docs/manpage.html
- `curl` IPv6 documentation: https://github.com/curl/curl/blob/master/docs/MANUAL.md
- `grpcurl` README: https://github.com/fullstorydev/grpcurl
- RFC 3986 URI syntax for IPv6 literals: https://www.rfc-editor.org/rfc/rfc3986.html
- OneUptime API monitor docs: https://oneuptime.com/docs/monitor/api-monitor
- OneUptime Website monitor docs: https://oneuptime.com/docs/monitor/website-monitor
- OneUptime IP monitor docs: https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The Envoy CORS example used `CorsPolicy` directly in `http_filters` and the deprecated `virtual_host.cors` field. I moved the policy to `typed_per_filter_config` and changed the filter config to `envoy.extensions.filters.http.cors.v3.Cors`, which matches current Envoy documentation.
- The Envoy upstream cluster used the deprecated top-level `http2_protocol_options` field. I replaced it with `typed_extension_protocol_options` and `HttpProtocolOptions`, which is the current Envoy configuration pattern for upstream HTTP/2.
- The sample backend address `2001:db8:backend::1` was not a valid IPv6 literal because `backend` is not valid hexadecimal. I replaced it with the valid documentation address `2001:db8::2` and updated all dependent examples.
- The Nginx section incorrectly presented `grpc_pass` as a gRPC-Web proxy for browsers. I corrected the section to explain that Nginx proxies native gRPC over HTTP/2 but does not translate gRPC-Web, and updated the sample config accordingly.
- The `curl` example used an IPv6 literal URL without `-g`, which `curl` requires to avoid treating square brackets as globbing syntax. I added `-g` and clarified that `request.bin` must contain a gRPC-Web framed request body.
- The `curl` example was missing the protocol-specific `x-user-agent` header recommended by the gRPC-Web protocol documentation. I added it.
- The `grpcurl` example referenced the invalid backend address and omitted a request payload. I updated it to use the corrected IPv6 address and an explicit JSON request body.
- The OneUptime section referred to generic "HTTP monitors", but current OneUptime documentation uses monitor types such as API, Website, and IP. I updated the wording to match the current product docs.

## Review Notes
- The TypeScript support in the official `grpc-web` documentation is still marked experimental. The post's example is valid, but generated filenames and imports depend on the user's actual `protoc` output.
- The `curl` example only applies to unary gRPC-Web requests and assumes the request payload has already been framed according to the gRPC-Web protocol.
