# Validation Summary: How to Implement API Gateway WebSocket and gRPC Protocol Support

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- API gateways
- WebSocket
- gRPC
- gRPC-Web
- NGINX
- Kong Gateway
- Envoy Proxy
- Prometheus
- wscat
- grpcurl
- Artillery

## Sources Consulted
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- NGINX gRPC module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- NGINX auth_request documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-subrequest-authentication/
- NGINX release notes for current HTTP/2 directive guidance: https://docs.nginx.com/nginx/releases/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades.html
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy upstream HTTP protocol options documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy gRPC documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc.html
- Envoy gRPC statistics filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_stats_filter.html
- Kong Gateway proxying documentation: https://developer.konghq.com/gateway/traffic-control/proxying/
- Kong gRPC-Gateway plugin documentation: https://developer.konghq.com/how-to/use-grpc-gateway/
- Kong Rate Limiting plugin reference: https://developer.konghq.com/plugins/rate-limiting/reference/
- Kong Key Auth plugin reference: https://developer.konghq.com/plugins/key-auth/reference/
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- gRPC core concepts documentation: https://grpc.io/docs/what-is-grpc/core-concepts/
- gRPC HTTP/2 protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- grpcurl usage documentation: https://github.com/fullstorydev/grpcurl
- Artillery run command documentation: https://www.artillery.io/docs/reference/cli/run

## Issues Found
- The NGINX gRPC example said gRPC support requires "NGINX 1.13+". The `ngx_http_grpc_module` was introduced in NGINX 1.13.10, so the version note was corrected.
- The NGINX gRPC example used `listen 443 ssl http2;`, which is deprecated in current NGINX releases. It was updated to `listen 443 ssl;` with `http2 on;`.
- The Envoy gRPC examples used the deprecated cluster-level `http2_protocol_options` field. They were updated to configure HTTP/2 through `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The Kong native gRPC example enabled the `grpc-gateway` plugin without its required `config.proto` and on a native gRPC route. Since the plugin is for HTTP/JSON-to-gRPC translation rather than basic native gRPC proxying, it was removed from that snippet.

## Review Notes
The examples remain illustrative and assume supporting services, generated gRPC-Web client stubs, Prometheus exporters, and load-test files exist. The WebSocket query-token example is technically valid, but production deployments should account for token exposure in logs and prefer secure transport.
