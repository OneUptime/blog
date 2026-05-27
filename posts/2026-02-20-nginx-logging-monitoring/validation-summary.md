# Validation Summary: How to Configure Nginx Logging and Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx access logging
- Nginx error logging
- Nginx log_format and JSON escaping
- Nginx conditional logging with map and access_log if
- Nginx upstream timing variables
- Nginx stub_status module
- logrotate

## Sources Consulted
- Nginx ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_stub_status_module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx core module error_log documentation: https://nginx.org/en/docs/ngx_core_module.html#error_log
- Nginx process control documentation for USR1 log reopening: https://nginx.org/en/docs/control.html
- Nginx ngx_http_core_module variable documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- Local logrotate 3.21.0 help output

## Issues Found
- The stub status example used `stub_status on;`. Current Nginx documentation lists the directive as `stub_status;`, with `stub_status on` noted as pre-1.7.5 syntax. Changed the example to `stub_status;`.
- The `$upstream_header_time` explanation described time to the first header byte. Nginx documents it as time spent receiving the response header from the upstream server. Updated the wording to match the official definition.
- The slow-log diagram said `Response Time > 0.5s?`, while the regex matches 0.5 seconds and above. Updated the diagram label to `Response Time >= 0.5s?`.
- The logrotate example only matched `/var/log/nginx/*.log`, but the post configures `/var/log/nginx/access.json`. Updated the rotation pattern to include `/var/log/nginx/*.json`.

## Review Notes
The examples assume the referenced upstream groups such as `api_backend`, `api_v1_backend`, and `api_v2_backend` are defined elsewhere in the Nginx `http` context. The `json_log` format also needs to be defined before any server or location uses it, as shown earlier in the post.
