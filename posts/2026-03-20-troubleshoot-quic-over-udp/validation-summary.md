# Validation Summary: How to Troubleshoot QUIC Protocol Issues Over UDP

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- QUIC (RFC 9000) transport protocol
- HTTP/3 (RFC 9114)
- UDP / Linux networking
- curl (HTTP/3 build)
- nginx (native QUIC, 1.25.0+)
- iptables, conntrack, netcat (nc), tcpdump
- Wireshark (QUIC dissector)
- Chromium / Chrome QUIC internals
- Cloudflare quiche, ngtcp2, quic-go
- TLS 1.3 / SSLKEYLOGFILE

## Sources Consulted
- RFC 9000 (QUIC v1 transport): https://datatracker.ietf.org/doc/html/rfc9000
- RFC 9114 (HTTP/3): https://datatracker.ietf.org/doc/html/rfc9114
- RFC 7838 (Alt-Svc): https://datatracker.ietf.org/doc/html/rfc7838
- curl HTTP/3 docs: https://curl.se/docs/http3.html
- nginx QUIC / HTTP/3 announcement (1.25.0): https://nginx.org/en/CHANGES
- nginx HTTP/3 directives: https://nginx.org/en/docs/http/ngx_http_v3_module.html
- Wireshark QUIC wiki: https://wiki.wireshark.org/QUIC
- Chromium net-internals: chrome://net-internals/#quic
- iptables/conntrack man pages
- Cloudflare quiche: https://github.com/cloudflare/quiche
- NSS/Chrome SSLKEYLOGFILE behavior: https://wiki.wireshark.org/TLS#using-the-pre-master-secret

## Issues Found
- Wireshark version claim was inaccurate. The post originally said "v1 support since Wireshark 3.2", but Wireshark 3.2 (Dec 2019) only had IETF QUIC draft (~draft-24) dissection — RFC 9000 (QUIC v1) wasn't published until May 2021, and Wireshark aligned its dissector with RFC 9000 in the 3.5 release (Oct 2021). Updated the comment to: "IETF QUIC since 3.0; RFC 9000 / v1 since 3.5".

## Review Notes
- `nc -zu <host> 443` is shown as a UDP reachability check. This is the de facto idiom but is inherently unreliable — UDP is connectionless, and `nc -z` reports "succeeded" whenever no ICMP unreachable arrives, even if a stateful middlebox silently drops the packet. The post's framing is acceptable for a quick smoke test, but readers troubleshooting hard cases should also send actual QUIC initial packets (e.g., via `quiche-client` or `curl --http3-only`) to confirm.
- `chromium --enable-quic` is a valid flag; modern Chrome enables QUIC by default for compatible servers, so the flag is mostly a no-op on recent builds but is harmless.
- The nginx `listen 443 quic reuseport` syntax is correct for the native nginx HTTP/3 implementation introduced in 1.25.0 (May 2023). Older deployments using the cloudflare/quiche or quic-nginx patches may use slightly different directives — out of scope for the post.
- The `Alt-Svc: h3=":443"; ma=86400` value matches RFC 7838 / RFC 9114 advertisement format.
- Worth noting (but not a defect): browsers cache `Alt-Svc` for `ma` seconds, so toggling HTTP/3 on/off during testing can produce sticky behavior. Future revisions could mention clearing the QUIC alt-svc cache via chrome://net-internals/#quic.
