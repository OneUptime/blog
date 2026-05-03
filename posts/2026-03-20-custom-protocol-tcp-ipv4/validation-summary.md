# Validation Summary: How to Implement a Custom Protocol over IPv4 TCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (standard library)
- `struct` module (binary packing/unpacking)
- `socket` module (BSD sockets, `AF_INET`, `SOCK_STREAM`)
- `threading` module
- `enum.IntEnum`
- IPv4 / TCP
- Custom application-layer protocol design (framing, versioning, length-prefixing)

## Sources Consulted
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html (format characters `B`, `H`, `I`; `!` byte order = network/big-endian)
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html (`AF_INET`, `SOCK_STREAM`, `SO_REUSEADDR`, `sendall`, `recv`)
- Python `enum` module documentation: https://docs.python.org/3/library/enum.html (`IntEnum`)
- Python `json` module documentation: https://docs.python.org/3/library/json.html (`json.loads` accepts bytes since Python 3.6)
- Python `threading` documentation: https://docs.python.org/3/library/threading.html
- RFC 793 / RFC 9293 (TCP) — confirms TCP is a byte stream with no message boundaries, motivating the framing approach
- Local verification: `python3 -c "import struct; print(struct.calcsize('!BBHI'))"` → 8 (matches stated header size)

## Issues Found
No technical issues found.

The wire format and the `struct.pack("!BBHI", ...)` format string are consistent: 1B version + 1B cmd + 2B flags (`H` unsigned short) + 4B length (`I` unsigned int) = 8 bytes, in network byte order. The `recvn` helper correctly handles short reads from `socket.recv`. `sendall` is correctly used to ensure full transmission. `SO_REUSEADDR` is set before `bind`, which is the correct order. Socket and JSON APIs used are current and non-deprecated.

## Review Notes
- The `tuple[int, int, int, int]` lowercase generic type hint requires Python 3.9+ (PEP 585). This isn't an error but worth noting for readers on older interpreters; they'd need `from typing import Tuple` and `Tuple[int, int, int, int]`.
- The "Unknown command" branch in `serve_client` is only reachable for CMD bytes that *are* valid `Cmd` enum values but have no registered handler. If the wire CMD byte is outside the enum (e.g., 99), `Cmd(cmd)` in `recv_message` raises `ValueError`, which is not caught by the `except (ConnectionError, struct.error)` clause and would terminate the connection thread. A more robust implementation would catch `ValueError` (or use `Cmd._value2member_map_.get(cmd)`) so malformed commands flow through the error-reply path. This is a design refinement, not an inaccuracy in what the post claims.
- `MAGIC` is named like a magic number but used as a version byte; the comment clarifies this. Cosmetic only.
- Binding to `0.0.0.0` exposes the server on all interfaces — fine for a tutorial, but readers deploying this should be aware.
