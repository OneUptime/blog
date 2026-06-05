# Validation Summary: How to Configure NGINX W3C Trace Context Propagation with traceparent

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- NGINX
- NGINX ngx_otel_module
- OpenTelemetry
- W3C Trace Context
- W3C Baggage
- HTTP proxy header propagation
- curl
- Flask
- WebSocket proxying

## Sources Consulted
- NGINX ngx_otel_module documentation: https://nginx.org/en/docs/ngx_otel_module.html
- NGINX ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- NGINX ngx_http_core_module embedded variables documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- W3C Baggage Recommendation: https://www.w3.org/TR/baggage/

## Issues Found
- The post described `proxy_pass_header` as an alternative for preserving trace context request headers. This was incorrect because NGINX documents `proxy_pass_header` as controlling response headers passed from a proxied server to the client. I changed the section to warn against using it for request header forwarding and clarified that `proxy_set_header` is the correct directive for forwarding `traceparent`, `tracestate`, and `baggage` to upstreams.
- The request ID correlation example placed `log_format` inside a `server` block, but NGINX documents `log_format` as valid only in the `http` context. I wrapped the example in an `http` block, kept `access_log` in the `server` block, and left the proxy settings in a valid context.
- The request ID example said it generated a unique request ID "if not provided," but the shown configuration always sets `X-Request-ID` to NGINX's `$request_id`. I corrected the comment to say it sets a unique NGINX request ID for upstream correlation.

## Review Notes
NGINX's `proxy_pass_request_headers` defaults to `on`, so many incoming request headers are passed unless explicitly disabled or overwritten. The explicit `proxy_set_header` examples remain valid because they make trace context forwarding behavior clear and avoid surprises when other proxy header settings are present.
