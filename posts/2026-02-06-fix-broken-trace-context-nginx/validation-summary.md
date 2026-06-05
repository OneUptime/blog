# Validation Summary: How to Fix Broken Trace Context When Requests Pass Through NGINX

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry
- NGINX reverse proxy configuration
- NGINX OpenTelemetry module
- W3C Trace Context
- Express / Node.js HTTP headers
- curl
- B3 propagation headers

## Sources Consulted
- NGINX Reverse Proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- NGINX ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX ngx_otel_module documentation: https://nginx.org/en/docs/ngx_otel_module.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Node.js HTTP API documentation: https://nodejs.org/api/http.html

## Issues Found
- The post incorrectly implied that NGINX commonly strips `traceparent` and `tracestate` by default. Updated the explanation to state that standard reverse proxying passes request headers by default, while specific configuration such as `proxy_pass_request_headers off`, invalid header handling, or empty `proxy_set_header` values can remove headers.
- The OpenTelemetry NGINX module example used non-official directive and module names, including `otel_ngx_module.so`, `opentelemetry_config`, `opentelemetry on`, `opentelemetry_operation_name`, and `opentelemetry_trust_incoming_spans`. Replaced the example with the official `ngx_otel_module` syntax: `load_module modules/ngx_otel_module.so`, `otel_exporter`, `otel_service_name`, `otel_trace`, `otel_span_name`, and `otel_trace_context propagate`.
- The TOML configuration example did not match the official NGINX OpenTelemetry module configuration model. Removed it and kept the correct NGINX-native exporter configuration.
- The `proxy_redirect`/rewrite pitfall overstated how those directives affect request headers. Updated it to focus on requests being handled by different `server` or `location` blocks and on `proxy_set_header` inheritance rules.
- The header-size guidance used `proxy_buffer_size` and `proxy_buffers`, which are response-buffering directives and do not increase incoming request header capacity. Replaced that guidance with `large_client_header_buffers` and noted that W3C `tracestate` is expected to fit within normal limits.

## Review Notes
The explicit `proxy_set_header traceparent $http_traceparent` and `proxy_set_header tracestate $http_tracestate` examples are valid, but they are a remediation for configurations that are not preserving headers; they are not required for a simple default NGINX reverse proxy that already passes request headers.
