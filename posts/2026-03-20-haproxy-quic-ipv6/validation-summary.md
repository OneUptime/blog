# Validation Summary: How to Configure HAProxy with QUIC and IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- QUIC
- HTTP/3
- IPv6
- TLS 1.3
- curl
- OpenSSL / quictls
- OneUptime

## Sources Consulted
- HAProxy Configuration Manual 2.6: https://docs.haproxy.org/2.6/configuration.html
- HAProxy Configuration Manual 2.8: https://docs.haproxy.org/2.8/configuration.html
- HAProxy HTTP protocol support tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/http/
- HAProxy Runtime API `show quic`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-quic/
- HAProxy 2.6 release announcement: https://www.haproxy.com/blog/announcing-haproxy-2-6/
- HAProxy blog, "How to Enable QUIC Load Balancing on HAProxy": https://www.haproxy.com/blog/how-to-enable-quic-load-balancing-on-haproxy
- curl HTTP/3 documentation: https://curl.se/docs/http3.html
- RFC 9001, Using TLS to Secure QUIC: https://www.rfc-editor.org/rfc/rfc9001.html
- RFC 9114, HTTP/3: https://www.rfc-editor.org/rfc/rfc9114.html
- OneUptime Port Monitor docs: https://oneuptime.com/docs/monitor/port-monitor
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The post stated `HAProxy 2.6+` as the general requirement without noting that 2.6 support was experimental. I updated the version guidance to `HAProxy 2.7+` and noted that HTTP/3 over QUIC was introduced experimentally in 2.6, matching HAProxy's current community documentation.
- The prerequisites said `OpenSSL 3.0+` was sufficient for HAProxy QUIC builds. HAProxy's official QUIC build guidance for community builds requires a QUIC-compatible TLS library such as quictls, so I corrected the prerequisite and build section accordingly.
- The QUIC frontend example used `bind [::]:443 quic` and `bind 0.0.0.0:443 quic`, which does not match HAProxy's documented QUIC bind syntax. I replaced those with `quic6@:443` and `quic4@:443`.
- The sample `ssl-request-max-ver TLSv1.3` line did not enable 0-RTT and was misleading. I removed it and replaced it with an accurate note that 0-RTT is disabled by default unless `allow-0rtt` is added to the QUIC bind lines.
- The sample backend IPv6 addresses were invalid (`2001:db8:backend::...`). I replaced them with valid documentation-prefix IPv6 examples.
- The PEM assembly example concatenated certificate, chain, then key. HAProxy documents PEM material as `PrivateKey+Certificate(+Intermediate chain)`, so I corrected the file order.
- The firewall section opened only UDP 443 even though the configuration also serves TCP 80 and TCP 443. I updated the commands to open the required TCP and UDP ports.
- The verification command used `curl --http3`, which can fall back to older HTTP versions and is not a strict HTTP/3 validation. I changed it to `curl --http3-only`.
- The stats example queried `localhost` while the stats listener bound only to `::1`. I updated the example to use `http://[::1]:8404/stats`.
- The monitoring note implied QUIC-specific stats came from the stats page in HAProxy 2.8+. I corrected it to point to the Runtime API `show quic` command, which is the documented way to inspect QUIC connections.

## Review Notes
- HAProxy 2.6 introduced HTTP/3 over QUIC experimentally; current HAProxy community tutorial guidance documents client-side HTTP/3 configuration for 2.7 and newer.
- Newer HAProxy releases continue to evolve QUIC and TLS-library compatibility. This post now matches the documented quictls-based community build path instead of assuming generic OpenSSL support.
- The `openssl s_client -tls1_3` check validates TLS 1.3 on the TCP/TLS listener, not HTTP/3 itself. The `curl --http3-only` check is the stronger end-to-end validation for QUIC/HTTP/3.
