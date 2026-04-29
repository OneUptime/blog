# Validation Summary: How to Implement Message Framing for Python IPv4 TCP Sockets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- TCP
- IPv4 sockets
- Python `socket` module
- Python `struct` module
- Application-layer message framing

## Sources Consulted
- Python Socket Programming HOWTO: https://docs.python.org/3/howto/sockets.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- RFC 9293, Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293

## Issues Found
- `_recvn()` claimed to read exactly `n` bytes but could return truncated data if the peer closed early. I updated it to raise `ConnectionError` on premature close so the length-prefixed and fixed-size examples behave as documented.
- The server example treated `b""` as a closed connection. In a length-prefixed protocol, a zero-length payload is still a valid framed message, so I removed that check and relied on `ConnectionError` for actual disconnects.
- The delimiter example rewrote embedded newlines on send but never reversed that transformation on read, which changed the payload. I updated it to reject embedded newlines instead.
- The comparison table implied delimiter framing always adds 1 byte of overhead and cited HTTP as a simple delimiter-framed protocol. I updated it to say delimiter-length overhead and narrowed the examples to line-oriented text protocols such as SMTP and IRC.

## Review Notes
- The examples use `str | None` type syntax, which requires Python 3.10 or newer.
- I ran a local `python3` sanity check of the corrected framing helpers; no issues were found in the updated examples.
