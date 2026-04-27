# Validation Summary: How to Pass IPv6 Client IP Through Reverse Proxies

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (HTTP reverse proxy, ngx_http_realip_module)
- HAProxy
- IPv6 addressing (RFC 4291, RFC 3849 documentation prefix, RFC 4193 ULA)
- X-Forwarded-For / X-Real-IP HTTP headers
- Python 3 `ipaddress` standard library module
- Flask (Python web framework)
- curl

## Sources Consulted
- Nginx ngx_http_realip_module docs: https://nginx.org/en/docs/http/ngx_http_realip_module.html (`set_real_ip_from`, `real_ip_header`, `real_ip_recursive`)
- Nginx ngx_http_proxy_module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (`proxy_set_header`, `$remote_addr`, `$proxy_add_x_forwarded_for`)
- HAProxy 2.x configuration manual: https://docs.haproxy.org/2.8/configuration.html (`option forwardfor`, `http-request set-header`, `%[src]` fetch)
- Python 3 `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html
- Flask `request.headers` / `request.remote_addr` docs: https://flask.palletsprojects.com/
- MDN X-Forwarded-For docs: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- RFC 4193 (Unique Local Addresses, `fc00::/7`, `fd00::/8` for locally assigned)

## Issues Found
- **Invalid IPv6 example address `2001:db8:lb::/48`** (originally appeared in two places: the Nginx `set_real_ip_from` example and the Python `TRUSTED_PROXIES` list). The string `lb` is not a valid hex group — IPv6 hextets must be hex digits (0-9, a-f). Confirmed with `python3 -c "ipaddress.ip_network('2001:db8:lb::/48')"`, which raises `ValueError`. This would have caused the Python sample to crash at import time. Replaced both occurrences with `2001:db8:abcd::/48`, which is a valid documentation-prefix subnet.

## Review Notes
- The Nginx and HAProxy snippets are syntactically correct. `option forwardfor` followed by `http-request set-header X-Forwarded-For %[src]` is somewhat redundant (the set-header overwrites whatever forwardfor produced), but it is not incorrect — the final XFF value is the source IP only, which is the author's stated intent.
- The comment "Get the leftmost untrusted IP as the real client IP" is slightly imprecise terminology — Nginx's `real_ip_recursive on` walks right-to-left and stops at the first untrusted IP, which is the leftmost untrusted only when no spoofed entries are prepended. The author's accompanying comment ("walk the list right-to-left, stop at first untrusted") describes the actual algorithm correctly, so the section is not misleading in practice. Left as written.
- `fd00::/8` is technically valid as the locally-assigned ULA range (RFC 4193 reserves `fc00::/7`, with the L=1 half being `fd00::/8`). It is broad as a "trusted proxy" range but acceptable for an example.
- `VARCHAR(45)` for IPv6 storage is correct: the longest textual IPv6 form is the IPv4-mapped notation `0000:0000:0000:0000:0000:ffff:255.255.255.255` (45 chars).
- The Flask snippet omits `from flask import Flask` and the `app = Flask(__name__)` constructor, but is presented as an excerpt rather than a full standalone script, so this was not changed.
