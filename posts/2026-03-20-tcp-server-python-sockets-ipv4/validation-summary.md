# Validation Summary: How to Create a TCP Server Using Python Sockets with IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `socket` module
- TCP
- IPv4
- netcat
- `ss`

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- OpenBSD `nc(1)` manual page: https://man.openbsd.org/nc.1
- iproute2 `ss(8)` manual page: https://manpages.opensuse.org/Leap-16.0/iproute2/ss.8.en.html
- Local Python 3.12.3 syntax/API checks
- Local `nc -h` and `ss --help` output

## Issues Found
- The netcat test command could hang with OpenBSD netcat because it did not request network socket shutdown after stdin reached EOF. Changed `echo "Hello, server!" | nc 127.0.0.1 9000` to `echo "Hello, server!" | nc -N 127.0.0.1 9000`, matching the documented `-N` behavior.

## Review Notes
The Python socket examples are syntactically valid and use current, non-deprecated APIs. `SO_REUSEADDR` behavior is platform-specific, but the article's restart-focused explanation matches the POSIX behavior documented by Python. The example decodes received bytes as UTF-8 for logging, so arbitrary non-UTF-8 client data could raise `UnicodeDecodeError`; this is acceptable for a basic text echo example but worth noting for production code.
