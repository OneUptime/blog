# Validation Summary: How to Build a Peer-to-Peer File Sharing Application over IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (standard library)
- Python `socket` module (TCP/IPv4)
- Python `struct` module (binary header packing)
- Python `hashlib` module (MD5)
- Python `threading` module
- TCP/IP networking (IPv4)

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html (verified `>I` = big-endian unsigned 32-bit int, 4 bytes; `>Q` = big-endian unsigned 64-bit int, 8 bytes)
- Python `hashlib` module documentation: https://docs.python.org/3/library/hashlib.html (verified `md5().hexdigest()` returns a 32-character hex string)
- Python `os.path` documentation: https://docs.python.org/3/library/os.path.html
- Python HOWTO — Socket Programming: https://docs.python.org/3/howto/sockets.html

## Issues Found
- **Missing `import struct` in Multi-File Server snippet**: The `handle` function uses `struct.pack(">I", ...)` and `struct.unpack(">I", ...)` but the snippet's import block did not include `struct`. As written, the snippet would raise `NameError: name 'struct' is not defined`. Added `import struct` to the imports in that code block.

## Review Notes
- The `send_file` function opens the file twice (once for checksum, once for transfer). This is inefficient but correct. Streaming both passes via a single read with running hash is a possible improvement, though the current approach is simpler and clearer for a tutorial.
- `pct = sent / filesize * 100` will raise `ZeroDivisionError` for empty files. Acceptable for a teaching example, but worth a guard in production.
- The `threading` import in the Multi-File Server snippet is unused as shown — the snippet defines a per-connection `handle` function that would be dispatched by a threaded accept loop, but the loop itself is not included. Left as-is since it signals the intended usage.
- MD5 is appropriate here as an integrity check (not a security primitive). The conclusion correctly recommends TLS for production deployments where confidentiality/authenticity matter.
- Using `f"{output_dir}/{filename}"` works on POSIX/Windows but `os.path.join(output_dir, filename)` would be more idiomatic. Not a correctness issue.
- The receiver does not sanitize `filename` before writing to disk, so a malicious sender could supply a path-traversal name (e.g., `../etc/passwd`). This is a known limitation of toy P2P tutorials and the post explicitly defers hardening to "production applications" in the conclusion.
