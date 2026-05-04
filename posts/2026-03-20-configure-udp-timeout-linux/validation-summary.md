# Validation Summary: How to Configure UDP Timeout Values on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux UDP sockets (Berkeley sockets API)
- Python 3 `socket` module (`settimeout`, `setsockopt`, `SO_RCVTIMEO`)
- Python `select` module (`select.select`)
- Python `struct` module (packing `timeval`)
- Linux `nf_conntrack` (netfilter connection tracking) sysctls
- `sysctl` CLI

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `select` module documentation: https://docs.python.org/3/library/select.html
- Linux `socket(7)` man page (SO_RCVTIMEO semantics): https://man7.org/linux/man-pages/man7/socket.7.html
- Linux kernel `nf_conntrack-sysctl.txt` documentation: https://www.kernel.org/doc/Documentation/networking/nf_conntrack-sysctl.txt
- Linux kernel source `net/netfilter/nf_conntrack_proto_udp.c` for default timeout values (`UDP_CT_UNREPLIED = 30s`, `UDP_CT_REPLIED = 120s`)
- POSIX `recvfrom(2)` semantics for EAGAIN/EWOULDBLOCK on SO_RCVTIMEO expiry

## Issues Found
No technical issues found.

Specific verifications:
- `sock.settimeout(2.0)` raising `socket.timeout` is correct (in Python 3.10+ this exception is an alias for `TimeoutError` but the name still works).
- `struct.pack('ll', 1, 500000)` correctly packs a `struct timeval` on 64-bit Linux where both `tv_sec` (`time_t`) and `tv_usec` (`suseconds_t`) are 8-byte longs. Math is correct: 1s + 500000µs = 1.5s.
- The `BlockingIOError` exception is appropriate when `SO_RCVTIMEO` is set via `setsockopt` (without `settimeout()`) because the kernel returns `EAGAIN` and Python wraps it as `BlockingIOError` since `s->sock_timeout` is still `None`.
- `nf_conntrack_udp_timeout` default of 30s and `nf_conntrack_udp_timeout_stream` default of 120s match the upstream kernel defaults in `net/netfilter/nf_conntrack_proto_udp.c`.
- `select.select([sock], [], [], TIMEOUT)` is the correct 4-arg form returning `(rlist, wlist, xlist)`; an empty `rlist` correctly indicates timeout.
- `/proc/sys/net/netfilter/nf_conntrack_count` and `net.netfilter.nf_conntrack_max` are the correct paths.

## Review Notes
- Subtle Python detail: Mixing `settimeout()` and direct `SO_RCVTIMEO` via `setsockopt` can be confusing because Python's `settimeout()` uses internal `select`-based timeouts and may override the kernel-level value. The post's second example correctly avoids this by only using `setsockopt`.
- The `struct.pack('ll', ...)` format relies on native long width and is portable to 64-bit Linux (the post's stated platform). On 32-bit platforms or different ABIs (e.g., x32), the layout could differ, but this is not relevant for the target audience.
- `nf_conntrack_udp_timeout_stream` only applies once conntrack sees traffic in both directions (the "ASSURED" / replied state); the post's "flows with traffic in both directions" description matches this accurately.
- Defaults for these sysctls have remained stable across recent kernel versions, so the values quoted are still current as of late 2025.
