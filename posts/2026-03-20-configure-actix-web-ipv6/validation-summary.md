# Validation Summary: How to Configure Actix-web for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Actix-web
- Rust
- IPv6
- Tokio runtime
- `std::net`
- `socket2`
- `curl`
- `ss` / iproute2

## Sources Consulted
- Actix Web `HttpServer` docs: https://docs.rs/actix-web/latest/actix_web/struct.HttpServer.html
- Actix Web `HttpRequest` docs: https://docs.rs/actix-web/latest/actix_web/struct.HttpRequest.html
- Actix Web `HttpMessage` docs: https://docs.rs/actix-web/latest/actix_web/trait.HttpMessage.html
- Actix Web `ConnectionInfo` docs: https://docs.rs/actix-web/latest/actix_web/dev/struct.ConnectionInfo.html
- Rust `std::net::Ipv6Addr` docs: https://doc.rust-lang.org/std/net/struct.Ipv6Addr.html
- `socket2::Socket` docs: https://docs.rs/socket2/latest/socket2/struct.Socket.html
- curl tutorial: https://curl.se/docs/tutorial.html
- curl man page: https://curl.se/docs/manpage.html
- Local CLI help output for `ss --help`

## Issues Found
- The introduction and Step 1 described binding to `[::]:8080` as automatically dual-stack. That is not guaranteed by Actix-web itself; it depends on the platform and the `IPV6_V6ONLY` socket option. I corrected the wording and replaced the “IPv6-only” example with a listener configured explicitly via `socket2` and `HttpServer::listen()`.
- The middleware snippet did not compile as written with current Actix-web because the boxed future needed `Svc::Future: 'static`. I added the required bounds and made the boxed future lifetime explicit.
- The handler snippet was missing the `HttpMessage` trait import needed for `req.extensions()`. I added the import.
- The handler defaulted to `::1` when no IP extension was present, which can incorrectly report an unknown client as loopback. I changed the fallback to use `req.peer_addr()` first and only then `::`.
- The test command used the documentation prefix address `2001:db8::1` as if it were a live endpoint and did not disable curl globbing for bracketed IPv6 literals. I replaced it with `curl -g -6` examples and a `YOUR_SERVER_IPV6` placeholder, and made the `ss` verification IPv6-specific.

## Review Notes
- No remaining technical inaccuracies were found after the fixes above.
- Actix-web also provides `ConnectionInfo::realip_remote_addr()`, which can parse `Forwarded` and `X-Forwarded-For`; the custom middleware shown here is still valid, but proxy headers should only be trusted in deployments where spoofing is controlled.
- The updated code paths were compile-checked in a minimal scratch project against `actix-web` 4.13.0 with Rust 1.93.0 on 2026-05-06.
