# Validation Summary: How to Handle Binary Protocols Over TCP in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- TCP sockets and stream framing
- asyncio streams
- struct binary packing and unpacking
- Binary protocol message design

## Sources Consulted
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- Python `asyncio` streams documentation: https://docs.python.org/3/library/asyncio-stream.html
- Python Socket Programming HOWTO: https://docs.python.org/3/howto/sockets.html
- IETF RFC 1700, referenced by Python for network byte order: https://datatracker.ietf.org/doc/html/rfc1700
- GitHub author profile: https://github.com/nawazdhandala
- OneUptime related reading links: https://oneuptime.com/blog/post/2026-01-25-background-task-processing-fastapi/view and https://oneuptime.com/blog/post/2025-01-06-python-websocket-fastapi/view

## Issues Found
- The `framing.py` and `binary_parser.py` examples imported unused names. Removed the unused imports to keep the file examples clean.
- The `LoginMessage.pack()` example used `struct`'s fixed-width `32s` field without checking token length. Python pads or truncates `s` fields to the specified width, so a token longer than 32 bytes would be silently truncated. Added a length check that raises `ValueError`.
- The `DataMessage.unpack()` example unpacked the 4-byte payload length without first checking that those bytes were present. Added an explicit length check so malformed input raises the example's intended `ValueError` rather than `struct.error`.
- The `tcp_server.py`, `tcp_client.py`, and `server_example.py` examples were presented as files but omitted imports for earlier example modules. Added the necessary imports.
- The "Always Validate Input" snippet used an undefined `Message` return type and `HEADER_SIZE` constant. Updated it to return `MessageHeader` and use `MessageHeader.SIZE`.
- The message type validation snippet used `MessageType.__members__.values()`. Replaced it with `MessageType(msg_type)` inside a `try`/`except ValueError`, which is the direct enum validation pattern.
- The "Handle Partial Reads" snippet used `await` at top level. Wrapped it in an async function and added an EOF check for `reader.read()`.

## Review Notes
The main technical guidance is accurate: TCP is a byte stream that requires application-level framing, length-prefixed framing is a sound approach for reusable TCP connections, `asyncio.start_server()` and `asyncio.open_connection()` are current stream APIs, `StreamWriter.write()` with `drain()` is appropriate, and `struct`'s `>` and `!` prefixes correctly represent big-endian and network byte order respectively. The post tag list includes "Protocol Buffer", but the article does not discuss Protocol Buffers directly.
