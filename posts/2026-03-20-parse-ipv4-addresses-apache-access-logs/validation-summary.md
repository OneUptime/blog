# Validation Summary: How to Parse IPv4 Addresses from Apache Access Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HTTP Server (Combined Log Format)
- awk / shell (sort, uniq, head, wc)
- Python 3 (re, collections.defaultdict, collections.Counter)
- Apache 2.4 access control (`mod_authz_host`, `Require` directives)
- fail2ban (referenced in conclusion)

## Sources Consulted
- Apache HTTP Server `mod_log_config` documentation: https://httpd.apache.org/docs/2.4/mod/mod_log_config.html
- Apache HTTP Server logs documentation: https://httpd.apache.org/docs/2.4/logs.html
- Apache `mod_authz_host` documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_host.html
- Apache `mod_authz_core` documentation (`<RequireAll>`, `Require not`): https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Python `re` and `collections` standard library docs: https://docs.python.org/3/library/re.html, https://docs.python.org/3/library/collections.html
- GNU `awk` user's guide: https://www.gnu.org/software/gawk/manual/gawk.html

## Issues Found
No technical issues found.

The Apache Combined Log Format string `%h %l %u %t "%r" %>s %O "%{Referer}i" "%{User-Agent}i"` is correct and matches Apache's default `combined` LogFormat. The awk field indexing is correct given whitespace splitting:
- `$1` = client IP (`%h`)
- `$6` = leading quote + method (e.g. `"GET`, `"POST`) — matches the post's `$6 == "\"POST"` filter
- `$9` = status code (`%>s`)
- `$10` = bytes sent (`%O`)

The Python regex correctly captures the IP, timestamp, method, path, status, and byte fields, and correctly handles the `-` placeholder that can appear in the bytes column (relevant when `%b` is used; with `%O` the field is always numeric).

The Apache 2.4 access control snippet using `<RequireAll>` with `Require all granted` plus `Require not ip` is the correct idiom — `Require not` directives must be wrapped inside `<RequireAll>` or `<RequireNone>` per `mod_authz_core` rules. CIDR notation (`203.0.113.0/24`) is supported by `Require ip` from `mod_authz_host`.

The example IPs (`203.0.113.x`, `198.51.100.x`) are correctly drawn from the RFC 5737 documentation ranges.

## Review Notes
- The post uses `%O` (bytes sent including headers) implicitly via field `$10`. If a server uses `%b` instead, the bytes field can be `-` for zero-byte responses; the Python code already handles this, but the awk bandwidth aggregation (`bytes[$1]+=$10`) will silently coerce `-` to `0` in arithmetic context — behavior is correct, just worth noting.
- The `awk '$6 == "\"POST"'` pattern relies on no leading whitespace or alternate quoting in the request field; this holds for the standard combined format but would break if a custom LogFormat changed the request rendering.
- The brute-force detection example uses status 401, which is appropriate for HTTP Basic/Digest auth failures. Application-layer login failures often surface as 200 or 302 and would not be caught by this rule — a future improvement could mention this caveat, but it is not technically incorrect.
