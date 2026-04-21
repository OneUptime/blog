# Validation Summary: How to Test HTTP/3 Connectivity over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HTTP/3
- QUIC
- IPv6
- curl
- quiche-client
- ngtcp2
- Chrome/Edge DevTools
- Firefox about:networking
- Python subprocess automation
- Alt-Svc headers
- OneUptime monitoring

## Sources Consulted
- curl HTTP/3 documentation: https://curl.se/docs/http3.html
- curl option version list: https://curl.se/docs/optionsall.html
- curl command-line man page: https://curl.se/docs/manpage.html
- Cloudflare quiche README and Docker image notes: https://github.com/cloudflare/quiche
- Cloudflare quiche client argument source: https://raw.githubusercontent.com/cloudflare/quiche/master/apps/src/args.rs
- ngtcp2 README and client usage: https://github.com/ngtcp2/ngtcp2
- ngtcp2 client source/help options: https://raw.githubusercontent.com/ngtcp2/ngtcp2/main/examples/client.cc
- RFC 9000, QUIC transport: https://datatracker.ietf.org/doc/html/rfc9000
- RFC 9114, HTTP/3: https://www.rfc-editor.org/rfc/rfc9114.html
- RFC 7838, HTTP Alternative Services: https://datatracker.ietf.org/doc/html/rfc7838
- Chrome DevTools Network panel reference: https://developer.chrome.com/docs/devtools/network/reference
- Firefox about:networking source: https://searchfox.org/firefox-main/source/toolkit/content/aboutNetworking.html
- LiteSpeed HTTP/3 verification docs: https://docs.litespeedtech.com/lsws/cp/cpanel/quic-http3/
- Cloudflare HTTP/3 documentation: https://developers.cloudflare.com/speed/optimization/protocol/http3/
- OneUptime website and synthetic monitor docs: https://oneuptime.com/product/monitoring and https://oneuptime.com/docs/monitor/synthetic-monitor

## Issues Found
- The curl version claim said modern versions 7.86+ include HTTP/3 support. Updated it to clarify that curl must be built with HTTP/3/QUIC support, that `--http3` was added in 7.66.0, and that `--http3-only` requires 7.88.0 or newer.
- The curl support check did not include `nghttp3` and was case-sensitive. Updated the grep command to include `nghttp3` and use case-insensitive matching.
- The quiche install/run example used `cargo install quiche-client` and `cloudflare/quiche-tools`, which are not the current documented paths. Replaced them with the official clone/cargo run workflow and the documented `cloudflare/quiche` Docker image.
- The quiche ALPN example used unsupported `--alpn h3`. Replaced it with `--http-version HTTP/3`, which maps to HTTP/3 ALPN selection in quiche-client.
- The ngtcp2 example used `ngtcp2client` and `NGTCP2_LOG=all`, which do not match current ngtcp2 client documentation. Replaced them with `examples/wsslclient` and `--qlog-file`.
- The Firefox diagnostic URL used `about:networking#quic`, but current Firefox about:networking exposes the HTTP table at `about:networking#http`. Updated the instruction.
- The online checker commands included a Cloudflare API URL and a QUIC.cloud URL that returned 404, and the http3check path redirected. Replaced them with a working `http3check.net` URL, Cloudflare's HTTP/3 test endpoint, and an alternate browser-based checker.
- The Python script re-ran every endpoint in `sys.exit`, which could duplicate checks and produce inconsistent results. Stored results from the first pass and used those for the exit code. Added `--show-error` so curl error text is available while using `--silent`.
- The Alt-Svc explanation was too absolute. Changed it to say HTTP/3 can be advertised via Alt-Svc.
- The OneUptime section implied a plain HTTP monitor can detect QUIC-specific failure. Updated it to clarify that an HTTP/3-only check is needed because normal HTTP monitoring may still pass over HTTP/2.

## Review Notes
- The post now matches current curl, quiche, ngtcp2, Firefox, and HTTP/3/Alt-Svc documentation. Some examples use documentation IPv6 addresses such as `2001:db8::1`, so readers must replace them with real routable IPv6 endpoints before running the commands.
