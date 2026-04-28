# Validation Summary: How to Block IPv4 Subnets in Nginx Using the Deny Directive

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (`ngx_http_access_module`, `ngx_http_log_module`, `ngx_http_map_module`)
- The `deny` / `allow` directives
- The `error_page` directive and named locations
- The `map` directive and conditional `access_log if=...`
- Nginx CLI (`nginx -t`, `nginx -s reload`)
- Bash, `curl`, `grep`, `awk`
- IPv4 CIDR notation

## Sources Consulted
- Nginx HTTP access module docs: https://nginx.org/en/docs/http/ngx_http_access_module.html
- Nginx HTTP log module docs (including `access_log if=` since 1.7.0): https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx HTTP map module docs: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx HTTP core module docs (`error_page`, named locations): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx variables reference: https://nginx.org/en/docs/varindex.html (to confirm that `$forbidden_ip` is not a built-in variable)
- RFC 5737 (documentation prefixes 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
- HTTP non-standard status 444 (Nginx's "no response" close-connection code)

## Issues Found

1. **Invented variable `$forbidden_ip` in the "Returning a Custom Response to Blocked IPs" example.**
   The original snippet relied on `if ($forbidden_ip = "1") { return 444; }`. There is no built-in `$forbidden_ip` variable in Nginx, and even if it existed the `if` would never be reached because a matching `deny` short-circuits the request to a 403 before location-level `if` blocks evaluate. Replaced the snippet with the standard pattern of using `error_page 403 = @blocked;` together with a named location `@blocked { return 444; }`, which is the documented way to convert the 403 produced by `deny` into a 444 connection close.

2. **Undefined variable `$status_is_403` in the "Logging Blocked Requests" example.**
   The original snippet used `access_log /var/log/nginx/blocked.log blocked if=$status_is_403;` but never defined `$status_is_403`. With an undefined/empty variable the condition is always false and nothing gets logged. Added the required `map $status $status_is_403 { 403 1; default 0; }` block (in the `http` context) so the conditional logging works as described, matching the behavior documented for `access_log`'s `if=` parameter.

## Review Notes

- All CIDR examples that use `192.0.2.0/24`, `198.51.100.0/24`, and `203.0.113.0/24` correctly use RFC 5737 documentation/test prefixes — appropriate choices for a tutorial.
- `100.64.0.0/10` is technically the RFC 6598 Carrier-Grade NAT (CGNAT) shared address space rather than a "cloud provider range used for scraping." The directive itself (`deny 100.64.0.0/10;`) is syntactically valid and works as advertised; only the inline comment characterizes it imprecisely. Left unchanged because it is a minor labeling nuance, not a code error, and per the review guidelines I avoided non-essential edits.
- `nginx -t` followed by `nginx -s reload` in the automation script is the safe, recommended pattern; if `nginx -t` fails the reload will not run thanks to `&&`.
- The shell pipeline `curl ... | grep -E '^[0-9]' | awk '{print "deny " $1 ";"}'` will work for feeds whose first column is the IP/CIDR, but it has no validation against malformed lines; in a production pipeline a stricter regex or `ipcalc`/`grepcidr` validation would be safer. Not strictly an error, just a hardening opportunity.
- `proxy_pass http://backend;` etc. use undeclared upstream names for brevity — acceptable in illustrative snippets; readers are expected to define corresponding `upstream` blocks.
- The conclusion's mention of `limit_req_zone` and `fail2ban` for dynamic blocking is accurate and reasonable.
