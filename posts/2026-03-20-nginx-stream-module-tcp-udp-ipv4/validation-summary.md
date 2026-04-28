# Validation Summary: How to Set Up Nginx Stream Module for TCP/UDP Proxying on IPv4

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (ngx_stream_core_module)
- Nginx ngx_stream_proxy_module
- Nginx ngx_stream_upstream_module
- Nginx ngx_stream_ssl_module
- Nginx ngx_stream_access_module
- TCP / UDP (Layer 4) proxying
- PROXY protocol
- TLS/SSL termination
- IPv4 address binding
- MySQL, Redis, PostgreSQL, DNS (as proxy targets)
- CLI tools: `nginx -V`, `dig`, `mysql`, `ss`

## Sources Consulted
- Nginx Stream Core Module documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx Stream Proxy Module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx Stream Upstream Module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx Stream SSL Module documentation: https://nginx.org/en/docs/stream/ngx_stream_ssl_module.html
- Nginx Stream Access Module documentation: https://nginx.org/en/docs/stream/ngx_stream_access_module.html
- Nginx Building from Sources / Configure options: https://nginx.org/en/docs/configure.html
- Debian/Ubuntu nginx-full package metadata (includes stream module by default)
- iproute2 `ss` man page (filter expressions, `dst` keyword)
- BIND `dig` man page (`@server` syntax)

## Issues Found
No technical issues found.

Verified items:
- `--with-stream` is the correct configure flag for enabling the stream module.
- `nginx -V 2>&1 | grep -o with-stream` is a valid (if loose) way to confirm stream support; `grep -o` may emit multiple matches when stream submodules are present, but it still confirms presence.
- The `stream {}` block sits at the top level of `nginx.conf` alongside `http {}` — correct.
- `listen IP:PORT` and `listen IP:PORT udp` are correct stream listener forms.
- `proxy_pass`, `proxy_connect_timeout`, `proxy_timeout`, `proxy_responses`, and `proxy_protocol on` are all valid stream directives with the documented semantics.
- Upstream parameters `max_fails`, `fail_timeout`, and `backup` are valid in the stream upstream module (open-source Nginx).
- `listen ... ssl`, `ssl_certificate`, `ssl_certificate_key`, and `ssl_protocols TLSv1.2 TLSv1.3` are correct for the ngx_stream_ssl_module.
- `allow`/`deny` directives are provided by ngx_stream_access_module and behave as documented.
- The verification commands (`mysql -h ... -P ...`, `dig @host name`, `ss -tn dst IP:PORT`) are syntactically correct.

## Review Notes
- `proxy_protocol on` in the stream proxy module sends PROXY protocol *to* the upstream; the inline comment "Pass real client IP via PROXY protocol" is accurate but could be made explicit that the upstream must understand PROXY protocol.
- Active health checks (beyond passive `max_fails`/`fail_timeout`) require Nginx Plus; the post correctly avoids implying otherwise by labeling the section "Health Checks" while only using passive checks.
- `proxy_responses 1` is appropriate for DNS where one response is expected per query; for multi-response UDP protocols this would need adjustment.
- On Debian/Ubuntu, the `nginx-full` package includes the stream module by default; the standard `nginx` package on recent releases also does. The prerequisite note remains accurate.
- No version-specific deprecations were identified as of Nginx 1.27.x mainline / 1.26.x stable.
