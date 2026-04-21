# Validation Summary: How to Transfer Files over IPv4 Using Python TCP Sockets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- TCP sockets
- IPv4 networking
- File transfer protocols
- Python `socket` module
- Python `struct` module

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python Socket Programming HOWTO: https://docs.python.org/3/howto/sockets.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293.html

## Issues Found
- The original server read the requested filename with a single `recv(256)`, but TCP does not preserve application message boundaries and `recv()` can return fewer bytes than requested. Updated the protocol to send a newline-terminated filename and added `recv_filename()` to read until the delimiter.
- The original protocol used a file size of `0` to mean "file not found", which made valid empty files impossible to transfer. Updated the protocol to send a separate one-byte status before the 8-byte size header.
- The original server joined the client-supplied filename directly to `/srv/files`, which could allow path traversal or absolute-path escape. Updated the example to use `os.path.basename()` before joining the path.
- The progress example silently stopped if the connection closed mid-transfer. Updated it to raise `ConnectionError`, matching the main receiver's behavior.
- The conclusion stated that TCP file transfer "requires" a length-prefix header and recommended MD5/SHA256 checksums. Updated the wording to say this protocol uses application-level framing and changed the checksum example to SHA-256.

## Review Notes
The examples are intentionally simple and handle one client connection at a time. A production implementation should also add authentication/authorization, stronger filename validation, timeouts, concurrent client handling, and an authenticated integrity check if tampering is in scope.
