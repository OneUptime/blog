# Validation Summary: How to Configure Rate Limiting on Nginx to Prevent Abuse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (`ngx_http_limit_req_module`)
- Nginx (`ngx_http_limit_conn_module`)
- Nginx `geo` and `map` modules
- HTTP status codes (429 Too Many Requests, 503 Service Unavailable)

## Sources Consulted
- Official Nginx `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Official Nginx `ngx_http_limit_conn_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html
- Nginx blog post "Rate Limiting with NGINX and NGINX Plus" (algorithm reference)
- Nginx `ngx_http_geo_module` and `ngx_http_map_module` documentation

## Issues Found
- **Incorrect rate limiting algorithm**: The post described `ngx_http_limit_req_module` as using a "token-bucket" algorithm. The official Nginx documentation explicitly states the module uses the "leaky bucket" method. Changed "token-bucket rate limiting" to "leaky-bucket rate limiting" in the introduction.

## Review Notes
- Directive syntax for `limit_req_zone`, `limit_req`, `limit_req_status`, `limit_req_log_level`, `limit_conn_zone`, `limit_conn`, `limit_conn_status`, and `limit_conn_log_level` all match the official documentation.
- Memory sizing claim ("10MB stores ~160,000 IP addresses") is consistent with the Nginx documentation, which states a 1 MB zone holds about 16,000 64-byte states.
- The default status code for both `limit_req` and `limit_conn` rejections is 503; the post correctly notes this and demonstrates overriding it with `limit_req_status 429` / `limit_conn_status 429`.
- The valid log levels for `limit_req_log_level` and `limit_conn_log_level` are `info`, `notice`, `warn`, `error`. The `warn` value used in the post is valid.
- The `geo` + `map` whitelisting pattern is the standard idiom from the Nginx documentation: an empty key in `limit_req_zone` causes the request to bypass rate limiting.
- The grep pattern `"limiting requests"` correctly matches the actual error log message Nginx emits when requests are throttled.
- `$binary_remote_addr` is correctly described as more memory-efficient than `$remote_addr` (4 bytes for IPv4 vs. the variable-length string form).
