# Validation Summary: How to Get the Client IPv4 Address from HTTP Requests in Node.js

## Status
validated

## Post Type
Guide

## Technologies Covered
- Node.js
- Express
- HTTP request handling
- Reverse proxies and `X-Forwarded-For`
- IPv4-mapped IPv6 addresses

## Sources Consulted
- Express behind proxies: https://expressjs.com/en/guide/behind-proxies.html
- Express 5.x API reference (`req.ip`, `trust proxy`): https://expressjs.com/en/api.html
- Node.js HTTP API (`IncomingMessage.socket`, lowercased header keys): https://nodejs.org/api/http.html
- Node.js Net API (`net.Socket`, `remoteAddress`): https://nodejs.org/api/net.html

## Issues Found
- The direct-connection example called `startsWith()` on `req.socket.remoteAddress` without a fallback. I changed it to `req.socket.remoteAddress || ""` so the snippet does not throw if the address is unavailable.
- The reverse-proxy example implied a generic `trust proxy = 1` setup and a localhost bind that only fits some deployments. I updated the comments to say it trusts exactly one proxy hop, normalized the returned IP the same way as the direct example, and removed the localhost-only bind so the snippet no longer implies an incorrect topology.
- The manual trust-check example declared proxy CIDR ranges that were not actually enforced, missed `172.16.0.0/12` and `::1` in the check logic, and used unconditional string replacement on the socket address. I replaced that with explicit normalization plus a trust check that matches the documented private IPv4 ranges and loopback handling used in the snippet.
- The raw `http` example trusted `X-Forwarded-For` whenever the header was present, which is unsafe and contradicted the conclusion. I updated it to read forwarded headers only when the direct peer matches a trusted proxy check.
- The conclusion recommended stripping the mapped-IPv6 prefix with `.replace("::ffff:", "")`, which is broader than needed. I changed the guidance to normalize the prefix conditionally and clarified that Express should use `trust proxy` only when the proxy-hop count matches the deployment.

## Review Notes
The post now accurately explains client IP extraction for direct connections and single-hop trusted-proxy setups. The title still says "IPv4", but native IPv6 clients will still appear as IPv6 literals; the snippets normalize IPv4-mapped IPv6 addresses rather than forcing all results to IPv4.
