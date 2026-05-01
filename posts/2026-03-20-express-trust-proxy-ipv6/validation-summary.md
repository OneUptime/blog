# Validation Summary: How to Configure Express.js Trust Proxy for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Express.js
- Node.js
- IPv6
- NGINX
- `X-Forwarded-For`
- `express-rate-limit`

## Sources Consulted
- Express.js guide: Behind Proxies - https://expressjs.com/en/guide/behind-proxies.html
- Express.js API reference: `app.listen()`, `req.ip`, `req.ips` - https://expressjs.com/en/api.html
- Node.js `net` API: `net.isIPv4()`, `net.isIPv6()`, `server.listen()` - https://nodejs.org/api/net.html
- Node.js `http` API: `message.connection` deprecation and `message.socket` - https://nodejs.org/api/http.html
- NGINX `ngx_http_proxy_module`: `proxy_set_header`, `$proxy_add_x_forwarded_for` - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- express-rate-limit configuration: `limit`, `ipv6Subnet` - https://express-rate-limit.mintlify.app/reference/configuration
- express-rate-limit helpers: IPv6 key handling guidance - https://express-rate-limit.mintlify.app/reference/helpers
- curl documentation: IPv6 URL usage - https://curl.se/docs/tutorial.html

## Issues Found
- The post used invalid example IPv6 literals: `2001:db8::lb` and `2001:db8::proxy`. These are not valid hexadecimal IPv6 segments, so they were replaced with valid documentation-prefix examples.
- The `trust proxy` hop-count example implied that `1` hop was appropriate for a load balancer plus NGINX chain. Express determines the client IP by walking from `req.socket.remoteAddress` through `X-Forwarded-For` from right to left, so the article was updated to clarify that `1` hop is only for a single trusted proxy and that a load balancer plus NGINX chain needs `2` hops or explicit proxy addresses.
- The middleware manually parsed `X-Forwarded-For` when `req.ip` was absent and fell back to `req.connection.remoteAddress`. That was corrected to rely on `req.ip` when trust proxy is configured and to fall back only to `req.socket.remoteAddress`, which also avoids the deprecated `req.connection` alias.
- The debug server used `app.listen('[::]:3000', '::')`, which does not match the Express/Node TCP listen signature and can create a Unix socket path instead of binding IPv6 TCP. This was corrected to `app.listen(3000, '::')`.
- The debug response labeled `req.socket.remoteAddress` as `connection.remoteAddress`. The label was corrected to match the API actually used.
- The rate-limit example used a custom IPv6 `/64` key generator based on splitting the textual address. That approach breaks on compressed IPv6 forms and is not the current recommended express-rate-limit approach. It was replaced with the documented `ipv6Subnet: 64` option, and `max` was updated to the current `limit` option name.
- The NGINX comment incorrectly said `$proxy_add_x_forwarded_for` sets `X-Forwarded-For` to the real client IPv6 address. NGINX actually appends `$remote_addr` to any existing `X-Forwarded-For` chain, so the comment was corrected.
- The conclusion overstated that listing proxy addresses is the only valid configuration method and that `req.ip` simply returns the client address from `X-Forwarded-For`. It was corrected to reflect both trusted-address and hop-count configurations and Express's trusted-proxy-chain evaluation behavior.

## Review Notes
- The post is now technically sound for current Express and Node behavior.
- Express populates `req.ip` and `req.ips` from the trusted proxy chain based on `X-Forwarded-For`; it does not use `X-Real-IP` for `req.ip`.
