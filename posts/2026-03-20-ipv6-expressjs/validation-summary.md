# Validation Summary: How to Use IPv6 with Express.js

## Status
validated

## Post Type
Guide

## Technologies Covered
- Node.js
- Express.js
- IPv6
- HTTP
- Reverse proxy handling

## Sources Consulted
- Node.js `net` API: https://nodejs.org/api/net.html
- Express 5.x API (`app.listen()`, `req.ip`, `req.params`): https://expressjs.com/en/api.html
- Express guide on proxies: https://expressjs.com/en/guide/behind-proxies.html
- Express routing guide: https://expressjs.com/en/guide/routing.html
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 5952, IPv6 Address Text Representation: https://www.rfc-editor.org/rfc/rfc5952.html
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421.html
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981.html

## Issues Found
- The binding section said `'::'` "enables dual-stack" as if that were guaranteed. I updated it to match Node's documentation: binding to `'::'` binds the IPv6 unspecified address and may also accept IPv4 connections on many operating systems.
- The client IP section implied `req.ip` is only populated when `trust proxy` is configured. I corrected the explanation to reflect Express behavior: `req.ip` is always available, and `trust proxy` changes how proxy headers are trusted.
- The `/64` rate-limiting example derived prefixes by splitting on `:` and taking the first four pieces, which breaks for compressed IPv6 forms such as `2001:db8::1`. I replaced it with normalization logic that expands IPv6 addresses before calculating the `/64` key, and changed the middleware to prefer `req.ip`.
- The routing example manually called `decodeURIComponent()` on `req.params.address` even though Express already decodes route params. I removed the extra decode.
- The routing section implied IPv6 literals in URL paths must be URL-encoded because of brackets, and the sample did not actually normalize equivalent IPv6 spellings before lookup. I updated the explanation to distinguish path segments from host syntax and normalized stored and looked-up IPv6 addresses to a stable full form.

## Review Notes
- The normalization helper uses a dependency-free full 8-hextet lowercase form rather than RFC 5952 compressed form; this keeps the example self-contained while still making equivalent IPv6 spellings compare consistently.
- If the deployment requires IPv6-only listening rather than platform-dependent dual-stack behavior, Node supports `ipv6Only` through the `server.listen(options)` form that Express passes through.
