# Validation Summary: How to Get the Client IPv4 Address Behind a Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nginx
- Reverse proxies
- HTTP headers (`X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`, `Forwarded`)
- Python
- Flask
- Werkzeug `ProxyFix`
- Node.js
- Express
- RFC 7239

## Sources Consulted
- NGINX `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Werkzeug `ProxyFix` documentation: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- Flask documentation on returning JSON from views: https://flask.palletsprojects.com/en/stable/patterns/javascript/
- Flask API reference: https://flask.palletsprojects.com/en/stable/api/
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies.html
- Express API reference: https://expressjs.com/en/api.html
- RFC 7239, Forwarded HTTP Extension: https://www.rfc-editor.org/rfc/rfc7239

## Issues Found
- The introduction implied the real client IP is already present in `X-Forwarded-For` even "without configuration." This was corrected to make clear that the proxy must be configured to forward it.
- The Flask example trusted `X-Forwarded-Host` via `x_host=1`, but the accompanying Nginx example did not send an `X-Forwarded-Host` header. The example was corrected to trust only the forwarded headers that the Nginx config actually sets.
- The RFC 7239 sample was presented as generic `Forwarded` parsing even though the parser only handled a single forwarded-element, not comma-separated multi-hop values. The comments, function name, and conclusion were narrowed so the code matches the claim.

## Review Notes
- No remaining technical issues after the corrections above.
- The post is intentionally IPv4-focused. If it is expanded to IPv6 later, RFC 7239 requires IPv6 node identifiers in `Forwarded` to be quoted and enclosed in brackets.
- NGINX documents `$proxy_add_x_forwarded_for` for `X-Forwarded-For`; the `Forwarded` example in this post is now explicitly limited to a simple single-hop case.
