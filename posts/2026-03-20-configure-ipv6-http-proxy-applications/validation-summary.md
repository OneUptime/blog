# Validation Summary: How to Configure IPv6 HTTP Proxy in Applications

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 URL syntax (RFC 3986 / RFC 2732)
- Standard proxy environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY)
- Python `requests` library
- Node.js with `https-proxy-agent` and `node-fetch`
- curl CLI proxy flags
- Java JVM system properties for proxy configuration
- proxychains-ng configuration
- HTTP CONNECT method for tunneling

## Sources Consulted
- RFC 3986 (URI generic syntax — bracket notation for IPv6 in URLs): https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2
- RFC 2732 (Format for literal IPv6 addresses in URLs): https://www.rfc-editor.org/rfc/rfc2732
- curl manual (`curl --help all`) for `--proxy`, `--proxytunnel`, `--noproxy`: https://curl.se/docs/manpage.html
- Python `requests` documentation on proxies: https://requests.readthedocs.io/en/latest/user/advanced/#proxies
- `https-proxy-agent` npm package (v5+ named export pattern): https://www.npmjs.com/package/https-proxy-agent
- Java networking properties documentation (`http.proxyHost`, `https.proxyHost`): https://docs.oracle.com/javase/8/docs/technotes/guides/net/proxies.html
- proxychains-ng project for IPv6 support and config syntax: https://github.com/rofl0r/proxychains-ng

## Issues Found
- **Misleading curl `--proxytunnel` comment**: The original comment read "For HTTPS proxy using CONNECT method." This conflated two distinct concepts: an "HTTPS proxy" means the client speaks TLS to the proxy itself, while CONNECT tunneling is a method for relaying arbitrary TCP through an HTTP proxy. Additionally, curl already issues CONNECT automatically for HTTPS targets through an HTTP proxy, so `--proxytunnel` is redundant for HTTPS URLs — it is primarily useful for forcing CONNECT for non-HTTPS protocols. Updated the comment to: "Force CONNECT tunneling through the HTTP proxy (useful for non-HTTPS protocols)."

## Review Notes
- The Node.js example uses `require("node-fetch")`, which only works with `node-fetch` v2 (v3+ is ESM-only). This is not technically incorrect — v2 is still widely deployed — but readers on Node 18+ may prefer the built-in global `fetch` or use `import` with v3. Left as-is since it is a valid pattern.
- The Node.js example declares `const body = await response.text();` but never uses `body`. Stylistic only, not technically incorrect; left unchanged per scope guidance.
- Java's `http.proxyHost` and `https.proxyHost` system properties accept IPv6 addresses without brackets (the post correctly notes this). Java's networking stack handles the bracket-wrapping internally when constructing URLs.
- proxychains-ng (the maintained fork of proxychains) supports IPv6 proxy entries with the bare-address syntax shown. The original `proxychains` (unmaintained) does not support IPv6 — readers on older distros may need to upgrade.
- The verification example `curl --max-time 5 http://[2001:db8::1]:3128 -v` tests TCP/HTTP reachability of the proxy port but will not return a meaningful HTTP body (proxies generally reject bare HTTP requests with no target). It is still useful as a connectivity probe; left unchanged.
