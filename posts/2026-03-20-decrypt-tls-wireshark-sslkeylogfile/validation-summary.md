# Validation Summary: How to Capture HTTPS Traffic and Decrypt TLS in Wireshark with SSLKEYLOGFILE

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Wireshark / tshark (TLS decryption preferences, HTTP/2 display filters)
- SSLKEYLOGFILE / NSS Key Log Format
- TLS 1.2 / 1.3 (Perfect Forward Secrecy with ephemeral key exchange)
- Google Chrome / Mozilla Firefox (SSLKEYLOGFILE support)
- curl (SSLKEYLOGFILE env var support since 7.57.0 / built by default since 7.58.0)
- Python `ssl` module, `requests`, `urllib3`
- tcpdump (libpcap capture)
- mitmproxy (mentioned as alternative)

## Sources Consulted
- Wireshark TLS wiki: https://wiki.wireshark.org/TLS (preference name `tls.keylog_file`, menu path "Edit → Preferences → Protocols → TLS → (Pre)-Master-Secret log filename")
- Wireshark display filter reference for HTTP/2: https://www.wireshark.org/docs/dfref/h/http2.html (confirmed `http2.headers.status` is Unsigned 16-bit integer, not string)
- Wireshark User Guide §8.23 (Statistics → HTTP2 shows frame-type counts, not a "Requests" submenu)
- curl manpage and Daniel Stenberg's announcement (SSLKEYLOGFILE support added in curl 7.57.0, built by default since 7.58.0, Jan 2018)
- CPython source `Lib/ssl.py` — `ssl.create_default_context()` reads SSLKEYLOGFILE on Python 3.8+
- urllib3 source `urllib3/util/ssl_.py` — `create_urllib3_context()` reads SSLKEYLOGFILE in v2.0+ (April 2023)
- requests release notes — pinned urllib3<2 until requests 2.30.0 (May 2023)
- RFC 7540 §6.1 (HTTP/2 DATA frame type 0x0)
- NSS Key Log Format documentation (CLIENT_RANDOM line format)

## Issues Found

1. **Outdated/incorrect Python claim (Step 4).** The post stated "Python's ssl module doesn't honor SSLKEYLOGFILE by default. Use requests with custom SSL context or patch ssl module." This was true for legacy stacks (Python <3.8 or urllib3 1.x), but is no longer accurate: Python 3.8+ `ssl.create_default_context()` reads SSLKEYLOGFILE automatically, and urllib3 ≥2.0 / requests ≥2.30 honor it as well. **Fixed:** rewrote the comment block to describe the modern behavior and note the legacy urllib3 1.x caveat.

2. **Incorrect type for `http2.headers.status` filter (Step 6).** The post wrote `http2.headers.status == "200"` (string comparison). Per Wireshark's display filter reference, `http2.headers.status` is an Unsigned 16-bit integer; the correct syntax is `http2.headers.status == 200` (no quotes). **Fixed:** removed the quotes around the status codes 200 and 500.

3. **Incorrect Wireshark menu path (Step 6).** The post described "Statistics → HTTP2 → Requests" as showing request/response pairs with timing. There is no "Requests" submenu under Statistics → HTTP2 — that statistic exists for HTTP/1 (Statistics → HTTP → Requests) but not HTTP/2. The HTTP/2 statistic shows frame-type counts (HEADERS, DATA, SETTINGS, etc.). **Fixed:** corrected the menu path to "Statistics → HTTP2" and updated the description to "Frame-type breakdown / counts per HTTP/2 frame type".

## Review Notes
- All other technical content checks out: SSLKEYLOGFILE env var behavior in Chrome/Firefox, the NSS key log `CLIENT_RANDOM` line format, Wireshark TLS preferences path and `tls.keylog_file` tshark preference, curl env-var-triggered key logging, tcpdump capture syntax, `chmod 600` security guidance, `http2.type == 0` matching DATA frames per RFC 7540.
- Minor unaddressed nuance: TLS 1.3 keylog files contain multiple line types (`CLIENT_HANDSHAKE_TRAFFIC_SECRET`, `SERVER_HANDSHAKE_TRAFFIC_SECRET`, `CLIENT_TRAFFIC_SECRET_0`, `SERVER_TRAFFIC_SECRET_0`, `EXPORTER_SECRET`), not just `CLIENT_RANDOM` (which is the TLS 1.2 line type). The post's `CLIENT_RANDOM` example is still valid but readers debugging TLS 1.3 should know to expect additional line types — left as-is since the example is technically correct.
- The `kill %1` job-control trick after backgrounding tcpdump assumes no other prior background jobs in the shell session; works as written for a fresh shell.
- Curl's `-v` flag in the example is unrelated to key logging (only `SSLKEYLOGFILE` env var matters); kept as-is since `-v` is harmless and useful for debugging.
