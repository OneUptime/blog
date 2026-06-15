# Validation Summary: How to Configure Logging and Monitoring in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP server
- Nginx access and error logging
- Nginx log_format, access_log, error_log, map, syslog, and HTTP/2 configuration
- Nginx stub_status module
- NGINX Prometheus Exporter
- Nginx VTS module
- Prometheus, Grafana, Elasticsearch, and Kibana
- Shell log analysis with awk, sort, uniq, cut, and head

## Sources Consulted
- Nginx ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx ngx_http_stub_status_module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_map_module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX Prometheus Exporter documentation: https://github.com/nginx/nginx-prometheus-exporter
- Nginx VTS module documentation: https://github.com/vozlt/nginx-module-vts

## Issues Found
- The `stub_status on;` examples used the pre-1.7.5 argument form. Updated them to the current documented `stub_status;` syntax.
- The production example used `listen 443 ssl http2;`, where the `http2` listen parameter is deprecated in current Nginx. Updated it to `listen 443 ssl;` plus `http2 on;`.
- The complete configuration's slow-request map used `~^[2-9]`, which matches 2-9 second requests but misses 10 seconds and higher. Updated it to match 2 seconds and all larger integer-second values.
- The complete configuration exposed `stub_status` at `/metrics`, which can be confused with the Prometheus exporter's own `/metrics` endpoint. Renamed the Nginx status endpoint to `/stub_status` and clarified that it is for the exporter's scrape URI.

## Review Notes
- The NGINX Prometheus Exporter can scrape any configured `stub_status` URI, though its official examples commonly use `/stub_status` on port 8080 and expose Prometheus metrics separately on port 9113 at `/metrics`.
- The VTS module is a third-party Nginx module, not part of stock open source Nginx. The post's wording already says to configure Nginx with the VTS module, which is accurate.
