# Validation Summary: How to Implement a Custom Protocol over IPv4 UDP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (3.10+ for the `X | None` union syntax)
- `socket` standard library module (UDP / `SOCK_DGRAM`)
- `struct` standard library module (binary framing)
- `enum.IntEnum`
- IPv4 / UDP networking concepts (MTU, fragmentation, RFC 768)

## Sources Consulted
- Python `struct` docs — format characters and sizes: https://docs.python.org/3/library/struct.html#format-characters
- Python `socket` docs — `socket.socket`, `recvfrom`, `sendto`, `settimeout`: https://docs.python.org/3/library/socket.html
- Python `enum.IntEnum` docs: https://docs.python.org/3/library/enum.html#enum.IntEnum
- RFC 768 — User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768
- RFC 791 — Internet Protocol (IPv4 header overhead): https://www.rfc-editor.org/rfc/rfc791
- QUIC (RFC 9000): https://www.rfc-editor.org/rfc/rfc9000
- KCP reliable UDP library: https://github.com/skywind3000/kcp
- Verified `struct.calcsize("!BBHII") == 12` locally with Python 3.

## Issues Found
- **Section heading mismatch**: The "Wire Format" section was titled `(16-byte header)`, but the format string `"!BBHII"` produces a 12-byte header (1 + 1 + 2 + 4 + 4 = 12), and both the ASCII diagram and the inline comment `# 12 bytes` already say 12. Updated the heading to `## Wire Format (12-byte header)` to match the actual layout, the diagram, and the code.

## Review Notes
- The `MAX_PAYLOAD = 1400` recommendation is conservative. The strict IPv4 non-fragment ceiling on a 1500-byte Ethernet MTU is 1472 bytes (1500 − 20-byte IPv4 header − 8-byte UDP header), but 1400 is a widely used safety margin for tunneled / VPN paths. Acceptable as written.
- `payload[:MAX_PAYLOAD]` silently truncates oversized payloads; some readers may prefer raising. This is a design choice, not a technical error.
- The client signature uses `UDPMessage | None`, which requires Python 3.10+ (PEP 604). Worth noting for readers on older versions, but not incorrect.
- In Python 3.10+, `socket.timeout` is an alias for `TimeoutError`; the `except socket.timeout` clause remains valid.
- Calling `sock.settimeout(timeout)` inside the retry loop is harmless but only needs to be set once; not a correctness issue.
