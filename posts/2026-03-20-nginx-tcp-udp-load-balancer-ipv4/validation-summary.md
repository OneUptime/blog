# Validation Summary: How to Set Up Nginx as a TCP/UDP Load Balancer for IPv4 Traffic

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (stream module — `ngx_stream_core_module`, `ngx_stream_proxy_module`, `ngx_stream_ssl_module`, `ngx_stream_ssl_preread_module`, `ngx_stream_upstream_module`, `ngx_stream_log_module`)
- TCP and UDP load balancing (Layer 4)
- MySQL, PostgreSQL, Redis, DNS (as example backend protocols)
- SSL/TLS passthrough and termination
- SNI-based routing via `ssl_preread`

## Sources Consulted
- Nginx stream core module: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx stream proxy module: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx stream SSL preread module: https://nginx.org/en/docs/stream/ngx_stream_ssl_preread_module.html
- Nginx stream SSL module: https://nginx.org/en/docs/stream/ngx_stream_ssl_module.html
- Nginx stream upstream module: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx stream log module: https://nginx.org/en/docs/stream/ngx_stream_log_module.html

## Issues Found
No technical issues found.

Verified items:
- Build flag `--with-stream` is the correct flag for enabling the stream module; `nginx -V 2>&1 | grep stream` is a valid verification command.
- `stream { ... }` is a top-level configuration block (sibling to `http`), not nested inside `http`.
- TCP load balancing directives (`upstream`, `server`, `listen <port>;`, `proxy_pass`, `proxy_connect_timeout`, `proxy_timeout`) are correct.
- UDP listener syntax `listen 53 udp;` and `proxy_responses` directive are valid (from `ngx_stream_proxy_module`).
- `least_conn` and `weight=N` are valid load balancing options for stream upstreams.
- Passive health check parameters `max_fails` and `fail_timeout` are correct on `server` directives in stream upstream blocks. The note that active health checks (`health_check`) require Nginx Plus is accurate.
- `ssl_preread on` is a valid directive from `ngx_stream_ssl_preread_module` and exposes `$ssl_preread_server_name` for SNI inspection.
- SSL termination directives (`listen <port> ssl;`, `ssl_certificate`, `ssl_certificate_key`) are valid in stream context.
- All variables used in `log_format` (`$remote_addr`, `$upstream_addr`, `$time_local`, `$protocol`, `$status`, `$bytes_sent`, `$bytes_received`, `$session_time`) are valid stream variables.

## Review Notes
- The SSL Passthrough example enables `ssl_preread on` but does not actually route based on SNI — the `proxy_pass` points to a static upstream. The directive is valid and harmless here, but to actually leverage SNI-based routing the example would need a `map $ssl_preread_server_name ...` block driving `proxy_pass` to a variable. This is a missed opportunity for a more illustrative example rather than a technical error.
- The DNS UDP example uses `8.8.8.8:53` and `1.1.1.1:53` as upstreams, which are external public resolvers — fine for demonstration, but in production environments operators should typically point to internal recursive resolvers.
- The `ssl_preread` module must be compiled in with `--with-stream_ssl_preread_module`; the post does not call this out explicitly, though it is included in the standard Nginx packages from nginx.org.
