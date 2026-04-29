# Validation Summary: How to Handle IPv6 in Load Balancer X-Forwarded-For Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- HTTP `X-Forwarded-For`
- IPv4 and IPv6 addressing
- Nginx reverse proxy configuration
- Python `ipaddress`
- Node.js networking APIs
- Express middleware

## Sources Consulted
- Nginx `ngx_http_realip_module` documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Node.js `net` API documentation (`net.isIP`, `net.BlockList`): https://nodejs.org/api/net.html
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies.html
- Express API reference (`trust proxy`, `req.ip`, `req.ips`): https://expressjs.com/en/api.html
- AWS Application Load Balancer X-Forwarded headers documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html
- RFC 7239, `Forwarded` HTTP Extension: https://www.rfc-editor.org/rfc/rfc7239
- Nginx mailing list guidance on `real_ip_header` with `$proxy_add_x_forwarded_for`: https://mailman.nginx.org/pipermail/nginx/2017-June/054190.html

## Issues Found
- The Nginx and Python examples used `2001:db8:proxy::/48`, which is not a valid IPv6 network. I replaced it with the valid documentation prefix example `2001:db8:1234::/48`.
- The Nginx example combined `real_ip_header X-Forwarded-For` with `$proxy_add_x_forwarded_for`, which can duplicate the client address after the realip module rewrites `$remote_addr`. I changed the forwarded header example to append `$realip_remote_addr` instead.
- The Python example trusted `X-Forwarded-For` even when the direct peer was untrusted. I changed it so the header is only used when `remote_addr` is in a trusted proxy range.
- The Python `clean_xff_entry()` logic for stripping `IPv4:port` values was broken and would not parse the documented example correctly. I replaced it with working IPv4 port handling.
- The Python example did not treat IPv4-mapped IPv6 addresses consistently during trust checks. I normalized IPv4-mapped addresses before matching them against trusted proxy networks.
- The Node/Express example referenced `app.use(...)` without defining `app`, and it selected the leftmost non-internal IP instead of following a trusted-proxy walk from right to left. I replaced it with a complete Express middleware example that validates IPs, handles bracketed IPv6 plus port, normalizes IPv4-mapped addresses, and trusts only configured proxy ranges.
- The intro and IPv6-with-port example implied that bracketed IPv6 is a general XFF format. I tightened the wording to reflect that bracketed IPv6 in XFF is implementation-specific, such as when a load balancer appends the client port.

## Review Notes
- `X-Forwarded-For` is a de facto header rather than the standardized `Forwarded` header from RFC 7239, but the article’s focus on XFF is still technically relevant because it remains widely deployed.
- Bracketed IPv6 values in `X-Forwarded-For` are not the normal form for plain XFF lists; they are typically seen when an implementation also appends the client port.
