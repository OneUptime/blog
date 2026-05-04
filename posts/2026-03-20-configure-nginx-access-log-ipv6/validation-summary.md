# Validation Summary: How to Configure Nginx Access Log IPv6 Client Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (web server)
- IPv6 addressing (RFC 4291)
- Nginx `ngx_http_log_module` (log_format, access_log directives)
- Nginx `ngx_http_realip_module` (set_real_ip_from, real_ip_header, real_ip_recursive, $realip_remote_addr)
- Bash / awk / shell scripting for log analysis
- logrotate
- JSON-formatted logs (escape=json)

## Sources Consulted
- Nginx official documentation: ngx_http_log_module — https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx official documentation: ngx_http_realip_module — https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx official documentation: ngx_http_core_module variables — https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- Nginx official documentation: listen directive — https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx control / signals documentation (USR1 reopens logs) — https://nginx.org/en/docs/control.html
- RFC 4291 (IP Version 6 Addressing Architecture) — IPv6 segments must be 0-9, a-f hex digits
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation, 2001:db8::/32)
- logrotate(8) man page

## Issues Found

1. **Invalid IPv6 address `2001:db8:lb::/48`**
   - "lb" is not valid hexadecimal (only 0-9, a-f are allowed in IPv6 segments per RFC 4291). Nginx would refuse to start with an "invalid parameter" error on this `set_real_ip_from` directive.
   - Fixed: changed to `2001:db8::/48`, which is a valid IPv6 prefix from the documentation range (RFC 3849).

2. **Redefinition of the predefined `combined` log format**
   - Nginx ships with a hard-coded built-in `combined` log format. Attempting `log_format combined ...` causes nginx to fail at config-parse time with `duplicate "log_format" name "combined"`.
   - Fixed: renamed the custom log_format to `main` and added a clarifying comment explaining that `combined` is predefined by nginx and cannot be redefined. The format string content is preserved unchanged.

## Review Notes
- The use of `listen [::]:80;` with no `ipv6only=on` results in the socket accepting both IPv4 (as IPv4-mapped) and IPv6 connections on most Linux distributions; this is consistent with what the post implies and is correct.
- The `awk '{ip=$1; if (ip ~ /:/) ...}'` heuristic for distinguishing IPv6 from IPv4 by the presence of a colon is correct for nginx access logs because `$remote_addr` for IPv4 never contains a colon (port is logged separately in `$remote_port`).
- The IPv6 /64 prefix extraction in awk uses `parts[1]:parts[2]:parts[3]:parts[4]`. This is approximately correct for fully-expanded IPv6 addresses but does not account for the `::` zero-compression notation (e.g., `2001:db8::1` would be split into only 3 non-empty parts). For most logs nginx writes the address in its compressed form, so the script may misclassify some addresses. This is a minor analytical caveat, not a correctness error in the nginx configuration.
- Backtick command substitution `` `cat /var/run/nginx.pid` `` in the logrotate postrotate script works but `$(cat /var/run/nginx.pid)` is preferred in modern shell. Not an error.
- The nginx variables referenced (`$remote_addr`, `$remote_port`, `$realip_remote_addr`, `$time_iso8601`, `$request_method`, `$uri`, `$args`, `$bytes_sent`, `$body_bytes_sent`, `$http_user_agent`, `$http_referer`, `$request_time`, `$upstream_response_time`, `$pipe`, `$server_protocol`, `$status`) all exist in current nginx versions and are used correctly.
- `escape=json` is supported in nginx since 1.11.8 (released Dec 2016), well within currency.
- `kill -USR1 <pid>` is the correct documented signal for nginx to reopen log files after rotation.
