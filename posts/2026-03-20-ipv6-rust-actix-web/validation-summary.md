# Validation Summary: How to Use IPv6 with Rust Actix-Web

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rust
- Actix Web
- IPv6
- HTTP
- TLS
- Rustls

## Sources Consulted
- Actix Web `HttpServer` docs: https://docs.rs/actix-web/latest/actix_web/struct.HttpServer.html
- Actix Web `HttpRequest` docs: https://docs.rs/actix-web/latest/actix_web/struct.HttpRequest.html
- Actix Web `ConnectionInfo` docs: https://docs.rs/actix-web/latest/actix_web/dev/struct.ConnectionInfo.html
- Actix Web middleware docs: https://docs.rs/actix-web/latest/actix_web/middleware/index.html
- Rust standard library `Ipv6Addr` docs: https://doc.rust-lang.org/std/net/struct.Ipv6Addr.html
- Rustls `ServerConfig` docs: https://docs.rs/rustls/latest/rustls/server/struct.ServerConfig.html
- `rustls-pemfile` docs: https://docs.rs/rustls-pemfile/latest/rustls_pemfile/
- Linux `ipv6(7)` man page: https://www.man7.org/linux/man-pages/man7/ipv6.7.html

## Issues Found
- The dependency snippet omitted `futures-util`, but the middleware example imports `futures_util::future::{LocalBoxFuture, Ready, ready}` directly. I added `futures-util = "0.3"` so the example compiles as written.
- The binding comment and conclusion overstated dual-stack behavior for `[::]:port`. I corrected them to note that IPv4 acceptance depends on `IPV6_V6ONLY` and OS/socket configuration rather than being guaranteed.
- The client IP example manually parsed only `X-Forwarded-For`, which does not match Actix Web's documented `ConnectionInfo` behavior and ignored `Forwarded`. I changed the example to use `req.connection_info().realip_remote_addr()` with parsing fallback to `req.peer_addr()`.
- The shared-state example stored `Ipv6Addr` values but named them `allowed_prefixes`, which is inaccurate because `Ipv6Addr` represents an address, not a prefix/CIDR. I renamed the field and related variables to `allowed_addresses`.
- The conclusion said TLS uses `bind_rustls`, but the post's dependency choice and current Actix Web API for Rustls 0.23 use `bind_rustls_0_23`. I updated the wording to match the code and versioned API.
- The conclusion claimed the middleware provided access control, but the middleware example only logged requests. I corrected the text to describe logging and shared-state allowlists instead.
- The description claimed the post covered rate limiting by IPv6 prefix, but no such implementation appears in the article. I updated the description to reflect the actual topics covered.

## Review Notes
- The examples were cross-checked against current `actix-web` 4.x and `rustls` 0.23 APIs, and representative corrected snippets were compiled in a scratch crate.
- The TLS example assumes `key.pem` contains a PKCS#8 private key and that binding to port `443` is permitted in the target environment.
- `realip_remote_addr()` should only be trusted for security-sensitive logic when proxy headers are set by a trusted proxy.
