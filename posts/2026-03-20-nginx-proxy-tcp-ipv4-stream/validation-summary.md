# Validation Summary: How to Proxy TCP Traffic to IPv4 Backend Servers with Nginx Stream

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (open-source) `stream` module
- Layer-4 TCP/UDP proxying
- Nginx upstream load balancing (round-robin, `least_conn`, `hash`)
- Passive health checks (`max_fails`, `fail_timeout`)
- Stream-module logging (`log_format`, `access_log`)
- systemd / `systemctl reload`
- `ss` for socket inspection
- `redis-cli` (used only as a connectivity test client)

## Sources Consulted
- Nginx `ngx_stream_core_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx `ngx_stream_proxy_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx `ngx_stream_upstream_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx `ngx_stream_log_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_log_module.html
- Nginx `ngx_http_upstream_module` (for the `ip_hash` comparison): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- `ss(8)` man page (iproute2)
- `redis-cli` reference: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found
- **"IP hash" load-balancing claim** — The original "Load Balancing Methods" section said you could switch to "least-connections or IP hash." The stream module does **not** expose an `ip_hash` directive; that directive is only available in the `http` module. The stream module supports the `hash` directive, which can be combined with `$remote_addr` for client-IP affinity. I rewrote that sentence to reference the `hash` directive (with `hash $remote_addr` for client-IP affinity) and to note that `ip_hash` is `http`-only. The example block already used `least_conn`, so no code change was needed.

## Review Notes
- All directives used in the configuration examples (`stream`, `upstream`, `server`, `listen`, `proxy_pass`, `proxy_connect_timeout`, `proxy_timeout`, `least_conn`, `weight`, `backup`, `max_fails`, `fail_timeout`, `log_format`, `access_log`) are valid in their respective contexts per the official Nginx documentation.
- All log-format variables used (`$remote_addr`, `$time_local`, `$protocol`, `$status`, `$bytes_sent`, `$bytes_received`, `$session_time`, `$upstream_addr`) are documented stream-module variables. Stream `log_format` has been available since Nginx 1.11.4 (2016), so it is safe for any current distro package.
- `nginx -V 2>&1 | grep -o with-stream` works because `nginx -V` prints to stderr; `2>&1` redirects to stdout so `grep` can match. The `--with-stream` build flag has been the default in mainline-distributed packages on the major distros for several years, but checking is still a reasonable habit.
- A pedantic note about `listen 3306;` "on all IPv4 interfaces": with no address specified, Nginx binds to the IPv4 wildcard (`0.0.0.0`) on Linux for stream listeners, so the comment is accurate in practice. Readers who explicitly want IPv4-only could write `listen 0.0.0.0:3306;` to be unambiguous, but the existing wording is correct.
- Active health checks (`health_check` directive in stream upstreams) are correctly attributed to Nginx Plus only — they are not present in the open-source build.
