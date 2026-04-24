# Validation Summary: How to Understand QUIC Protocol with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- QUIC
- HTTP/3
- IPv6
- UDP
- curl
- quiche
- ngtcp2
- Python socket API

## Sources Consulted
- RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport — https://www.rfc-editor.org/rfc/rfc9000.html
- RFC 9001: Using TLS to Secure QUIC — https://www.rfc-editor.org/rfc/rfc9001.html
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 6437: IPv6 Flow Label Specification — https://www.rfc-editor.org/rfc/rfc6437.html
- RFC 7098: Using the IPv6 Flow Label for Load Balancing in Server Farms — https://www.rfc-editor.org/rfc/rfc7098.html
- curl HTTP/3 documentation — https://curl.se/docs/http3.html
- Python `socket` module documentation — https://docs.python.org/3/library/socket.html
- Linux `ipv6(7)` man page — https://man7.org/linux/man-pages/man7/ipv6.7.html
- cloudflare/quiche README — https://github.com/cloudflare/quiche
- ngtcp2 README — https://github.com/ngtcp2/ngtcp2
- OneUptime Website Monitor docs — https://oneuptime.com/docs/monitor/website-monitor
- OneUptime IP Monitor docs — https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The handshake section incorrectly labeled new QUIC connections as `0-RTT`. I changed it to a 1-RTT new-connection handshake and kept 0-RTT only for resumed connections, matching RFC 9001.
- The TCP + TLS 1.3 timing was described as `2+ RTTs before data` with a `1.5 RTT` TCP handshake. I corrected this to the standard 1 RTT TCP handshake plus 1 RTT TLS 1.3 handshake before protected application data.
- The curl installation guidance claimed `sudo apt-get install curl` on Ubuntu 22.04+ provides HTTP/3 support. I replaced this with `curl -V` verification and `--http3-only` testing because HTTP/3 support is build-dependent.
- The curl HTTP/3 test used `--http3`, which can fall back to HTTP/2 or HTTP/1.1. I changed it to `--http3-only` so the command actually verifies HTTP/3.
- The `quiche-client` and `ngtcp2client` examples did not match current official project docs. I updated them to the current documented quiche and ngtcp2 example client invocations.
- The packet-structure section described a generic QUIC packet as always containing `Version` and a single `Connection ID`. I narrowed it to a QUIC long-header packet and corrected the header fields.
- The post overstated IPv6 flow labels as identifiers for QUIC connections. I revised the text to describe them as per-flow load-distribution hints and explicitly not a replacement for QUIC connection IDs, consistent with RFC 6437 and RFC 7098.
- The Python example used `socket.IPV6_FLOWINFO_SEND`, which is not documented by Python's standard `socket` docs and is not exposed in common builds. I replaced it with a conservative AF_INET6 tuple example and added an OS-dependence caveat.
- The `0-RTT Resumption` bullet incorrectly referred to `IPv6 QUIC tokens`. I changed it to TLS 1.3 session resumption; QUIC `NEW_TOKEN` is for address validation, not 0-RTT itself.
- The monitoring section claimed OneUptime can specifically test QUIC connectivity and detect fallback behavior. I narrowed this to documented OneUptime capabilities: IPv6 availability monitoring and response-header checks such as `Alt-Svc`.

## Review Notes
- On this review machine, `curl 8.5.0` on Ubuntu 22.04 exposes `--http3` and `--http3-only` flags, but `curl -V` does not list `HTTP3` in `Features`; that is why the post now tells readers to verify build support instead of assuming it from the package version alone.
- IPv6 flow-label handling is platform-dependent and often managed by the OS or network stack rather than application code.
