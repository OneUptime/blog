# Validation Summary: How to Use Python asyncio with IPv6 Sockets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- IPv6
- TCP sockets
- UDP sockets
- `ipaddress`

## Sources Consulted
- Python `asyncio` streams documentation: https://docs.python.org/3/library/asyncio-stream.html
- Python `asyncio` event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python `asyncio` protocols documentation: https://docs.python.org/3/library/asyncio-protocol.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The TCP server example used `reader.read(1024)` even though the client sends newline-delimited messages and reads responses with `reader.readline()`. I changed the server to `reader.readline()` so the example uses consistent message framing and does not rely on TCP packet boundaries.
- The UDP example was missing `import socket`, which made `socket.AF_INET6` fail at runtime with `NameError`. I added the missing import.
- The UDP example used `asyncio.get_event_loop()` inside a coroutine. I changed it to `asyncio.get_running_loop()` to match current asyncio guidance for code running inside coroutines.
- The UDP example printed `[:]:9090`, which is not the correct textual form of the IPv6 unspecified address. I corrected it to `[::]:9090`.

## Review Notes
- The concurrent scan example uses `2001:db8::/32` documentation addresses, so that section is illustrative rather than expected to reach real external hosts.
- Dual-stack behavior and IPv4-mapped IPv6 peer addresses remain platform- and socket-option-dependent; the post correctly scopes that behavior to cases where `IPV6_V6ONLY=0`.
- The corrected patterns were additionally sanity-checked locally with Python 3.12.3.
