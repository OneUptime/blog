# Validation Summary: How to Handle X-Forwarded-For Headers with IPv6 at CDN Edge

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- X-Forwarded-For HTTP header
- IPv6 addressing
- Cloudflare CDN (CF-Connecting-IP header)
- AWS Application Load Balancer (ALB)
- nginx (`$proxy_add_x_forwarded_for`, `set_real_ip_from`, `real_ip_header`, `real_ip_recursive`)
- Python `ipaddress` standard library module
- Node.js `ipaddr.js` library
- Django (`USE_X_FORWARDED_HOST`, `SECURE_PROXY_SSL_HEADER`)
- Flask / Werkzeug `ProxyFix` middleware

## Sources Consulted
- MDN Web Docs: X-Forwarded-For — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
- RFC 7239 (Forwarded HTTP Extension) — https://datatracker.ietf.org/doc/html/rfc7239
- RFC 3849 (IPv6 Documentation Address Prefix 2001:db8::/32) — https://datatracker.ietf.org/doc/html/rfc3849
- Cloudflare: HTTP request headers (CF-Connecting-IP) — https://developers.cloudflare.com/fundamentals/reference/http-request-headers/
- Cloudflare IPv6 ranges (2606:4700::/32) — https://www.cloudflare.com/ips/
- AWS ALB documentation on X-Forwarded-For — https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html
- nginx docs: ngx_http_proxy_module `$proxy_add_x_forwarded_for` — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx docs: ngx_http_realip_module (`set_real_ip_from`, `real_ip_header`, `real_ip_recursive`) — https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Python `ipaddress` module — https://docs.python.org/3/library/ipaddress.html
- `ipaddr.js` library — https://github.com/whitequark/ipaddr.js
- Django settings (`USE_X_FORWARDED_HOST`, `SECURE_PROXY_SSL_HEADER`) — https://docs.djangoproject.com/en/stable/ref/settings/
- Werkzeug `ProxyFix` middleware — https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/

## Issues Found
- **Invalid IPv6/IPv4 example addresses**: The post used placeholders like `2001:db8::client`, `2001:db8::proxy1`, `2001:db8::cdn`, `2001:db8::admin`, `203.0.113.proxy`, `10.0.0.cdn`, and `2001:db8:cdn::/48`. These are not valid addresses because `client`, `proxy`, `cdn`, and `admin` are not valid hexadecimal digits. Critically, the Python example explicitly claimed `ipaddress.ip_address("2001:db8::client")` would parse and return that string, but it would actually raise `ValueError`, so the sample output `# 2001:db8::client` was wrong. Replaced with valid RFC 3849 documentation-range addresses (e.g., `2001:db8::1`, `2001:db8::100`, `2001:db8:abcd::/48`, `2001:db8::dead`) and adjusted the expected-output comment accordingly. The explanatory sentence that mentioned an "admin" IPv6 was rephrased to "forged IPv6".

## Review Notes
- The claim that X-Forwarded-For does not bracket IPv6 addresses is correct for the de facto XFF format; brackets are required in the RFC 7239 `Forwarded` header and when including a port.
- Cloudflare's IPv6 range `2606:4700::/32` is accurate.
- The Node.js example contains a minor unused destructured variable (`const [net, prefix] = proxy.split('/');`) — not technically incorrect, just dead code, so left as-is per the "only fix technical errors" rule.
- `ipaddress.ip_network(p, strict=False)` and `ip in network` membership checks in the Python `ipaddress` module are used correctly.
- `ProxyFix` parameters `x_for`, `x_proto`, `x_host` are correct for Werkzeug's current API.
- `TRUSTED_PROXIES` is not a built-in Django setting; the post correctly frames it as a value consumed by custom middleware.
