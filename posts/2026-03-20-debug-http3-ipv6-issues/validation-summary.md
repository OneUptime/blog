# Validation Summary: How to Debug HTTP/3 Issues over IPv6

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- HTTP/3 and QUIC (RFC 9000, RFC 9114)
- IPv6 (RFC 8200)
- TLS 1.3
- curl (`--http3`, `--trace-ascii`, `SSLKEYLOGFILE`)
- OpenSSL `s_client`
- tcpdump, Wireshark
- netcat (`nc`)
- ip6tables
- Nginx (Alt-Svc header, QUIC support)
- iputils `ping6`, `dig`, `ip` route/link commands

## Sources Consulted
- RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport (https://www.rfc-editor.org/rfc/rfc9000.html), §14.1 (1200-byte minimum Initial datagram)
- RFC 9114 — HTTP/3 (https://www.rfc-editor.org/rfc/rfc9114.html), §3.1 (Alt-Svc / `h3` ALPN)
- RFC 8200 — IPv6 Specification (https://www.rfc-editor.org/rfc/rfc8200.html), §5 (1280-byte minimum MTU)
- RFC 7838 — HTTP Alternative Services (https://www.rfc-editor.org/rfc/rfc7838.html)
- curl release history and man page (`--http3` added in 7.66.0; `--http3-only` in 7.88.0)
- Nginx 1.25.0 release notes (HTTP/3 in mainline, May 2023)
- IANA TLS ALPN Protocol IDs registry (`h3` registered for QUIC transport)
- Linux iputils `ping`/`ping6` man page (`-M do`, `-s`)
- nc/ncat man page (caveats around `-u -z`)

## Issues Found
- **Step 4: Misleading openssl ALPN h3 check.** The original snippet ran `openssl s_client -connect ... -alpn h3` and commented "should include h3". This is technically incorrect: `openssl s_client` only speaks TCP, while `h3` ALPN is exclusively negotiated over QUIC (UDP). Servers will not advertise `h3` in TLS-over-TCP ALPN responses; they advertise `h2`/`http/1.1`. Replaced with a corrected note explaining that h3 ALPN must be verified via a QUIC-capable client (e.g., `curl --http3`), and changed the openssl command to probe `h2,http/1.1` as a TCP baseline check.

## Review Notes
- `nc -6 -u -zv ... 443` (Step 2) is a commonly used UDP test but is inherently unreliable: UDP is connectionless, and `nc` only registers failure if an ICMP port unreachable comes back. Firewalls dropping ICMP, or servers that ignore non-protocol payloads, will yield false positives. The post pairs it with a `tcpdump` server-side check, which is the real verification, so the guidance is acceptable as-is.
- `curl --http3` (Step 3) attempts HTTP/3 with fallback. For strict HTTP/3-only testing without fallback, readers can use `--http3-only` (curl 7.88.0+).
- `ping6 -M do -s 1200` adds 8 bytes (ICMPv6) + 40 bytes (IPv6 header) for a 1248-byte on-the-wire packet — adequate for testing the IPv6 minimum MTU of 1280 but slightly under QUIC's 1200-byte UDP datagram requirement once UDP/IP overhead is added. This is sufficient for the diagnostic intent.
- Wireshark QUIC dissection actually predates 3.6 (basic support in 2.x), but "3.6+" is a reasonable practical recommendation for current RFC 9000 v1 support.
- Nginx HTTP/3 support requires mainline 1.25+ (May 2023) and a `listen 443 quic;` directive; the debug log snippet is correct but readers should be aware that QUIC must be compiled in and enabled.
