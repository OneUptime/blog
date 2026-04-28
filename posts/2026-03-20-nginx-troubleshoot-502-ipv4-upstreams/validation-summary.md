# Validation Summary: How to Troubleshoot Nginx 502 Bad Gateway with IPv4 Upstreams

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Nginx (HTTP reverse proxy / upstream module)
- Linux networking utilities: `curl`, `nc` (netcat), `ss`, `telnet`
- iptables (Linux firewall)
- Unix domain sockets / file permissions
- Bash scripting (parameter expansion, arrays)

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx debugging log documentation: https://nginx.org/en/docs/debugging_log.html
- Linux errno definitions (`/usr/include/asm-generic/errno.h`): EACCES=111 ECONNREFUSED, ETIMEDOUT=110, ECONNRESET=104
- iproute2 `ss` man page (for `-tlnp` flags)
- netcat (OpenBSD) man page (for `-z`, `-v`, `-w` flags)
- iptables man page (for `-I`, `-L`, `--dport`, `-s` syntax)
- Bash manual: Shell Parameter Expansion (`${var%pattern}`, `${var#pattern}`)

## Issues Found
No technical issues found.

All technical claims were verified:
- Nginx upstream error messages (Connection refused/timed out, prematurely closed, recv() reset, no live upstreams) match standard Nginx output.
- Linux errno numbers (111, 110, 104) are correct.
- `nc -zv`, `ss -tlnp`, `nginx -T`, `iptables -I/-L` flag usage is correct.
- Nginx directives (`proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`, `proxy_next_upstream`, `proxy_next_upstream_tries`, `max_fails`, `fail_timeout`) are valid and use correct syntax.
- Bash parameter expansion (`${backend%:*}` / `${backend#*:}`) correctly splits IP and port.
- Unix socket permission/ownership commands (`chmod 660`, `chown root:www-data`) are sensible defaults for Debian/Ubuntu where Nginx runs as `www-data`.

## Review Notes
- Debug-level error logging (`error_log ... debug;`) requires Nginx to be compiled with `--with-debug`. Official nginx.org packages and the Debian/Ubuntu `nginx` package include this since 1.9.8, so the snippet works on most modern installs without switching to a separate `nginx-debug` binary. Worth noting only for users on stripped-down or self-built binaries.
- The `telnet` command in Step 4 is fine for a quick port check, though `telnet` is no longer installed by default on many distros; `nc -zv` (already shown earlier in the post) is the more portable equivalent.
- The illustrative `ss` output column counts are slightly stylized vs. real output, but the highlighted distinction between `127.0.0.1:8080` and `0.0.0.0:8080` is the correct teaching point.
