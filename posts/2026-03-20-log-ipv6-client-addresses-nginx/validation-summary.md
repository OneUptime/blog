# Validation Summary: How to Log IPv6 Client Addresses in Nginx

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nginx
- IPv6
- Nginx access logging
- `ngx_http_realip_module`
- Shell log analysis (`awk`, `sort`, `uniq`, `wc`)
- Python `ipaddress`

## Sources Consulted
- Nginx `ngx_http_log_module` documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx `ngx_http_core_module` (`listen`) documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx `ngx_http_realip_module` documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx `ngx_http_map_module` documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx Trac ticket on `listen` / `ipv6only` behavior across virtual hosts: https://trac.nginx.org/nginx/ticket/364
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Local CLI help output: `awk --help`, `sed --help`

## Issues Found
- The `set_real_ip_from` example used `2001:db8:lb::/64`, which is not valid IPv6 syntax. I changed it to `2001:db8:100::/64`.
- The IP-version `map` classified IPv4-mapped IPv6 addresses such as `::ffff:192.168.1.1` as `IPv6`. I added an explicit rule so mapped IPv4 addresses are logged as `IPv4`.
- The text about mapped addresses was too broad. I changed it to clarify that this behavior occurs when requests arrive on a single IPv6 socket configured with `ipv6only=off`.
- The `real_ip_recursive` comment was inaccurate. Nginx does not simply “look through all” values; with `on`, it uses the last non-trusted address from the configured header. I corrected the comment.
- The `/64` aggregation command was not reliable for compressed IPv6 text forms like `2001:db8::1234:5678`. I replaced it with a `python3` example that uses the standard-library `ipaddress` module to normalize addresses before counting.
- The “unique IPv6 addresses” pipeline would also count IPv4-mapped IPv6 literals. I changed it to exclude dotted-quad mapped forms.
- The “status codes for IPv6 clients” command matched non-IPv6 lines because it searched for colons anywhere in the log line, and it printed the wrong field for common Nginx combined logs. I replaced it with an `awk` command that filters on the first field and extracts the status code from the request/status boundary.
- The summary sentence about `ipv6only=on` was imprecise. I rewrote it to reflect the common dual-socket configuration accurately.

## Review Notes
- The configuration examples are valid as standalone snippets. In multi-vhost setups, `listen` socket options such as `ipv6only=on` should only be specified once for a given `address:port` pair.
- `ngx_http_realip_module` is not built into nginx by default according to the official module documentation, though many packaged distributions include it.
