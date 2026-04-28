# Validation Summary: How to Implement Non-Blocking Sockets in Python for IPv4 Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python (standard library)
- `socket` module (AF_INET / SOCK_STREAM, IPv4 TCP)
- `select` module (`select.select`)
- `errno` module
- Concepts: blocking vs non-blocking I/O, `BlockingIOError`, `EAGAIN`/`EWOULDBLOCK`, `connect_ex`, `SO_REUSEADDR`
- Brief mention of `asyncio` as an alternative

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
  - `socket.setblocking(flag)` and equivalence with `settimeout(0.0)`
  - `socket.connect_ex` semantics (returns errno instead of raising)
  - `socket.send`, `socket.recv`, `socket.accept` non-blocking behavior
- Python `select` module documentation: https://docs.python.org/3/library/select.html
  - `select.select(rlist, wlist, xlist, timeout)` signature and return value
- Python `errno` module documentation: https://docs.python.org/3/library/errno.html
  - `errno.EAGAIN` / `errno.EWOULDBLOCK`
- Python `exceptions` documentation: https://docs.python.org/3/library/exceptions.html#BlockingIOError (subclass of `OSError`)
- PEP 3151 (rework of OS exceptions; `socket.error` aliased to `OSError` in Python 3.3+)

## Issues Found
No technical issues found.

## Review Notes
- The `dict[socket.socket, list[bytes]]` PEP 585 generic type hint requires Python 3.9+. This is fine for modern Python but worth noting for readers on older interpreters (would need `Dict`/`List` from `typing` instead).
- On Linux, `errno.EAGAIN` and `errno.EWOULDBLOCK` have the same value, so the check `e.errno == errno.EAGAIN` is sufficient. On some other POSIX systems they may differ; checking both (`e.errno in (errno.EAGAIN, errno.EWOULDBLOCK)`) would be more portable, but this is a robustness improvement rather than a correctness issue.
- `select.select` is portable but limited (FD_SETSIZE on many systems is 1024). For higher concurrency, `selectors` module (`DefaultSelector`) or `asyncio` is preferred — the post already steers readers toward `asyncio` in the conclusion.
- `accept()` on a non-blocking server socket can theoretically still raise `BlockingIOError` even after `select` reports readability (a known race in some kernels), but this is an edge case and the example reflects standard textbook usage.
- Minor typographical note (not technical): the introduction uses a hyphen where an em-dash was likely intended ("block-the thread sleeps"). Left unchanged per instructions to only fix technical errors.
