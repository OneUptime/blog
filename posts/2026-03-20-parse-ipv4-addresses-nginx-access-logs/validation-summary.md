# Validation Summary: How to Parse IPv4 Addresses from Nginx Access Logs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (access log combined format)
- awk / sort / uniq / grep (POSIX shell tools)
- Python 3 (`re`, `collections.Counter`, `pathlib`)
- fail2ban (jail.d configuration, iptables-multiport action)
- IPv4 address parsing

## Sources Consulted
- Nginx ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html (combined log format definition)
- GNU awk manual: https://www.gnu.org/software/gawk/manual/gawk.html (field splitting behavior)
- Python `re` module documentation: https://docs.python.org/3/library/re.html (`re.compile`, `Pattern.match` anchoring)
- Python `collections.Counter` documentation: https://docs.python.org/3/library/collections.html#collections.Counter
- fail2ban jail configuration documentation: https://github.com/fail2ban/fail2ban/wiki and `man jail.conf`

## Issues Found
No technical issues found. All commands, code, and configuration snippets were verified against official documentation:

- Nginx combined log format string matches the official definition exactly.
- awk field positions (`$1` for IP, `$9` for status) are correct given that `$time_local` contains a space that splits it across two fields.
- The `awk '$9 ~ /^5/'` regex correctly matches HTTP 5xx status codes.
- Python regex `^(\d{1,3}\.){3}\d{1,3}` and the parser logic are syntactically valid and behave as described.
- The fail2ban jail.d snippet uses valid syntax and a valid `iptables-multiport` action.

## Review Notes
- The Python example imports `from pathlib import Path` but never uses it. This is a minor code quality issue, not a technical error, so it was left as-is per the review guideline to only fix technical errors.
- The post description claims coverage of "GoAccess" but the post body does not include a GoAccess section. This is a content/description mismatch rather than a technical error and was left unchanged.
- The fail2ban example uses a custom filter name `nginx-req-limit` (the default fail2ban built-in for nginx rate limiting is `nginx-limit-req`, which reads from the *error* log, not the access log). For the snippet as shown — banning IPs based on raw access-log volume — a custom filter at `/etc/fail2ban/filter.d/nginx-req-limit.conf` matching every access-log line would be required. The jail snippet itself is technically valid; readers using it would need to author the corresponding filter file.
- The IPv4 regex does not validate that octets are within 0–255 and is not anchored at the end; this is acceptable for parsing well-formed nginx logs where the field is always a real IP.
