# Validation Summary: How to Configure Express.js for IPv6 Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Express.js
- Node.js
- IPv6
- `trust proxy`
- `rate-limiter-flexible`
- `ipaddr.js`
- `morgan`
- `curl`

## Sources Consulted
- Node.js `net.Server.listen()` documentation: https://nodejs.org/api/net.html
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies.html
- Express 5.x API reference for `app.listen()` and `req.ip`: https://expressjs.com/en/api.html
- `ipaddr.js` documentation: https://github.com/whitequark/ipaddr.js/
- `rate-limiter-flexible` API docs: https://github.com/animir/node-rate-limiter-flexible/wiki/API-methods
- `morgan` documentation: https://github.com/expressjs/morgan
- curl man page: https://curl.se/docs/manpage.html
- RFC 7239 (`Forwarded` header syntax and IPv6 formatting notes): https://www.rfc-editor.org/rfc/rfc7239

## Issues Found
- The introduction and conclusion said Express.js "requires" passing `'::'` to `app.listen()`. I corrected this because Node.js can also listen on the unspecified IPv6 address when the host is omitted and IPv6 is available.
- The dual-stack example treated `ipv6Only: false` as an unconditional IPv4+IPv6 guarantee. I adjusted the wording to reflect Node.js documentation more accurately: it leaves dual-stack enabled, but behavior still depends on OS support.
- The client IP middleware stripped square brackets from IPv6 addresses. I removed that logic because Express/Node IP strings and `X-Forwarded-For` IPv6 values are not expected to use URL-style brackets.
- The `/64` rate-limit example used `addr.mask(64)`, which is not part of the documented `ipaddr.js` API. I replaced it with a documented approach using `ipaddr.process()`, `kind()`, and `toNormalizedString()` to build a stable `/64` key.
- The test command used `2001:db8::1` as a live server endpoint. I replaced it with a note to use a real server IPv6 address because `2001:db8::/32` is reserved for documentation and is not a routable address for a real connectivity test.

## Review Notes
- `RateLimiterMemory` is correct for a single-process example, but production deployments with multiple Node.js processes or instances would need a shared store-backed limiter for consistent enforcement.
