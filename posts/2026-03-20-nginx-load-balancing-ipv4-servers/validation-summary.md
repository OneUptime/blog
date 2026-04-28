# Validation Summary: How to Configure Nginx Load Balancing Across IPv4 Servers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (open-source / Plus)
- Nginx `upstream` module / HTTP load balancing
- `proxy_pass`, `proxy_set_header`, `proxy_http_version`, proxy timeouts
- Load balancing algorithms: round-robin (default), `least_conn`
- Upstream server parameters: `backup`, `down`, `max_fails`, `fail_timeout`
- Bash, `curl`, `awk` for testing/log analysis

## Sources Consulted
- Nginx HTTP Upstream module: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP Proxy module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx HTTP Log module (`log_format`, `access_log`): https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx admin guide: HTTP load balancing — https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/

## Issues Found
- The "Testing the Load Balancer" section included `awk '{print $NF}' /var/log/nginx/access.log | sort | uniq -c | sort -rn` claiming to count requests per upstream server. With Nginx's default `combined` log format, the last whitespace-separated field is part of the `$http_user_agent` string, not the upstream address. The post had no preceding configuration to make `$upstream_addr` the last field. **Fix:** Added a `log_format` example that ends with `$upstream_addr` and an `access_log` directive enabling it, so the `awk` command now matches the stated purpose.

## Review Notes
- The `upstream` module statement that it "provides built-in load balancing for HTTP, TCP, and UDP traffic" is acceptable shorthand; technically TCP/UDP balancing is provided by the separate `stream` module's own `upstream` block, which has slightly different supported directives. Not changed because the post focuses on HTTP and the simplification does not produce wrong code.
- The `down` parameter comment "Temporarily removed from rotation" is informal but accurate enough — `down` marks the server as permanently unavailable until the config is reloaded, which is in practice a temporary removal achieved by editing config.
- `fail_timeout` is dual-purpose: it is both the window in which `max_fails` failures must occur AND the duration the server stays out of rotation. The post describes only the second meaning. This is a common simplification and not technically wrong, just incomplete.
- The example uses `proxy_http_version 1.1;` and `proxy_set_header Connection "";` which is the documented pattern, but for actual upstream connection reuse a `keepalive N;` directive in the `upstream` block is also required. The conclusion correctly notes this ("Combine with keepalive connections for maximum efficiency"), so the example is consistent with that follow-up note.
