# Validation Summary: How to Handle IPv6 in Access Control Lists in Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 and IPv4 address handling
- Application-layer access control lists (ACLs)
- Python `ipaddress`
- Node.js with `ipaddr.js`
- Express middleware
- NGINX `geo`-based IP access control

## Sources Consulted
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- ipaddr.js official README/API: https://github.com/whitequark/ipaddr.js
- Express 4.x API, `req.ip`: https://expressjs.com/en/4x/api.html#req.ip
- Express guide, "Express behind proxies": https://expressjs.com/en/guide/behind-proxies.html
- Node.js `net` module, `socket.remoteAddress`: https://nodejs.org/api/net.html#socketremoteaddress
- NGINX `ngx_http_geo_module` documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- RFC 4291, *IP Version 6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291
- RFC 5952, *A Recommendation for IPv6 Address Text Representation*: https://www.rfc-editor.org/rfc/rfc5952
- RFC 4007, *IPv6 Scoped Address Architecture*: https://www.rfc-editor.org/rfc/rfc4007

## Issues Found
- The Python example removed the literal substring `::ffff:` before parsing client addresses. That could corrupt ordinary IPv6 addresses that contain that hextet sequence but are not IPv4-mapped. I changed the code to parse first and then use `IPv6Address.ipv4_mapped`, which is the documented way to detect mapped addresses in Python.
- The Python and Node.js examples normalized incoming IPv4-mapped IPv6 clients to IPv4, but they did not normalize IPv4-mapped ACL entries. As written, rules such as `::ffff:192.168.1.1` or `::ffff:192.168.2.0/120` would not match after client normalization. I updated both examples so IPv4-mapped ACL entries are converted to equivalent IPv4 networks when that mapping is well-defined.

## Review Notes
- The Express middleware is technically correct, but `req.ip` only reflects the real client address behind proxies when Express `trust proxy` is configured to match the deployment.
- The NGINX `geo` example is valid for IPv6 CIDR matching and belongs in `http` context. If NGINX is behind another proxy and must evaluate forwarded client IPs, additional trusted-proxy or real-IP configuration is required.
- The examples strip zone identifiers from input strings. That is reasonable for many HTTP-facing ACL cases, but ACLs involving link-local scoped addresses may need interface-aware handling instead of dropping the zone.
