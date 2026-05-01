# Validation Summary: How to Set Up Envoy Access Logging with Client IPv4 Information

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy v3 access logging configuration
- YAML
- HTTP access logging
- TCP proxy access logging
- X-Forwarded-For
- Proxy Protocol

## Sources Consulted
- Envoy access logging usage and format rules: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy substitution formatter command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Envoy standard streams access logger v3 API (`StdoutAccessLog`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/stream/v3/stream.proto
- Envoy file access logger v3 API (`FileAccessLog`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/file/v3/file.proto.html
- Envoy common access log types and filters (`StatusCodeFilter`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/accesslog/v3/accesslog.proto
- Envoy TCP proxy v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/tcp_proxy/v3/tcp_proxy.proto
- Envoy HTTP connection manager address handling (`use_remote_address`, `xff_num_trusted_hops`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy X-Forwarded-For behavior and trusted client address rules: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html#x-forwarded-for

## Issues Found
- The JSON example logged `client_port` with `%DOWNSTREAM_REMOTE_ADDRESS%`, which returns the remote address and port together. I changed it to `%DOWNSTREAM_REMOTE_PORT%`, which is the correct operator for the downstream port.
- The post described `%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%` as returning an IPv4-only value. Envoy documents this operator as returning the downstream IP address without a port for both IPv4 and IPv6, so I updated the wording to refer to the client IP address instead.
- The post implied the downstream remote address is always the direct client address. Envoy documents that it may be inferred from X-Forwarded-For or Proxy Protocol, so I added a brief note pointing readers to `use_remote_address`, `xff_num_trusted_hops`, and Proxy Protocol configuration.

## Review Notes
- Validated against Envoy `latest` documentation and the current v3 API reference as of 2026-05-01.
- The snippets are partial configuration examples rather than full standalone Envoy bootstrap files, which is acceptable for this post format.
