# Validation Summary: How to Configure Nginx TCP Forwarding Based on Hostname

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX stream module
- NGINX SSL preread module and SNI routing
- NGINX stream upstream load balancing
- NGINX stream proxy module for TCP and UDP forwarding
- NGINX stream map module
- PROXY protocol
- OpenSSL and curl command-line testing

## Sources Consulted
- NGINX ngx_stream_core_module documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- NGINX ngx_stream_ssl_preread_module documentation: https://nginx.org/en/docs/stream/ngx_stream_ssl_preread_module.html
- NGINX ngx_stream_map_module documentation: https://nginx.org/en/docs/stream/ngx_stream_map_module.html
- NGINX ngx_stream_proxy_module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- NGINX ngx_stream_upstream_module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- NGINX TCP and UDP Load Balancing admin guide: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-udp-load-balancer/
- Local OpenSSL `s_client -help` output
- Local curl `--help all` output

## Issues Found
- The prerequisites command checked only for the stream module. SNI routing with `$ssl_preread_server_name` also requires the SSL preread module, so the text and command now check for both `with-stream` and `with-stream_ssl_preread_module`.
- The "Load Balancing with Health Checks" heading implied active health checks, but the example uses open-source NGINX upstream parameters such as `max_fails` and `fail_timeout`, which are passive failure handling settings. The heading and comment were changed to describe passive failure handling accurately.

## Review Notes
- The NGINX stream examples use directives and variables documented for the stream, upstream, proxy, map, and SSL preread modules.
- Active TCP/UDP health checks are a separate NGINX Plus feature path; the post's corrected example stays within open-source NGINX behavior.
