# Validation Summary: How to Configure Redis with NGINX TCP Proxy

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- NGINX (stream module / `ngx_stream_core_module`)
- NGINX Plus (active health checks)
- Redis
- TLS/SSL termination
- TCP load balancing

## Sources Consulted
- NGINX official documentation: `ngx_stream_core_module` — https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- NGINX official documentation: `ngx_stream_proxy_module` — https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- NGINX official documentation: `ngx_stream_upstream_module` — https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- NGINX official documentation: `ngx_stream_limit_conn_module` — https://nginx.org/en/docs/stream/ngx_stream_limit_conn_module.html
- NGINX official documentation: `ngx_stream_ssl_module` — https://nginx.org/en/docs/stream/ngx_stream_ssl_module.html
- NGINX official documentation: `ngx_stream_log_module` — https://nginx.org/en/docs/stream/ngx_stream_log_module.html
- NGINX Plus documentation on stream health checks — https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-health-check/
- HAProxy documentation on `option redis-check`

## Issues Found
No technical issues found.

## Review Notes
- The `proxy_timeout 3s` value used in the basic proxy and TLS termination examples is technically valid but quite aggressive. For Redis clients using blocking commands (`BLPOP`, `BRPOP`, `SUBSCRIBE`) or long-lived idle connections, this timeout would cause premature disconnections. The read/write split example appropriately uses `10s`. Users should tune this value based on their workload.
- The connection limit example uses `$remote_addr` as the key for `limit_conn_zone`. While correct, `$binary_remote_addr` would be more memory-efficient (4 bytes for IPv4 vs variable-length string). This is an optimization note, not an error.
- The post correctly distinguishes between open-source NGINX passive health checks and NGINX Plus active health checks, which is an important nuance often missed in similar guides.
