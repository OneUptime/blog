# Validation Summary: How to Troubleshoot TCP Connection Timeouts Between Services

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- TCP/IP protocol (SYN, SYN-ACK, RST handshake)
- Linux kernel networking (`net.ipv4.tcp_syn_retries`, `tcp_max_syn_backlog`, `tcp_syncookies`, `net.core.somaxconn`)
- `ping`, `nc` (netcat), `tcpdump` CLI tools
- `ss` (socket statistics) for accept queue inspection
- `iptables` firewall rules (DROP vs REJECT semantics)
- `dmesg` for SYN flood log inspection
- Python `httpx` HTTP client timeout configuration
- Python standard `socket` library timeout behavior

## Sources Consulted
- Linux `tcp(7)` man page — https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux kernel `ip-sysctl.txt` documentation (tcp_syn_retries behavior and timing)
- `ss(8)` man page for accept queue fields (Recv-Q/Send-Q semantics on LISTEN sockets)
- `iptables(8)` man page (DROP vs REJECT target differences)
- `tcpdump(8)` man page (filter expression syntax)
- httpx documentation — https://www.python-httpx.org/advanced/timeouts/
- httpx source `Timeout` class constructor (requires either positional default or all four named args: connect/read/write/pool)
- Python `socket` library documentation — https://docs.python.org/3/library/socket.html (socket.timeout aliased to TimeoutError since 3.10)

## Issues Found

1. **Incorrect default SYN timeout duration (introduction and conclusion).**
   - The post claimed the kernel exhausts SYN retransmissions "about 63 seconds by default" and referenced "kernel default (63s)" in the conclusion.
   - The Linux kernel `ip-sysctl.txt` documentation explicitly states: with the default `tcp_syn_retries=6`, the last retransmission occurs at ~63 seconds, but the final timeout for the active TCP connection attempt happens at ~127 seconds.
   - Fixed the introduction to say "about 127 seconds by default with `tcp_syn_retries=6`" and the conclusion to "~127s".

2. **Broken `httpx.Timeout` constructor call.**
   - The original code was:
     ```python
     httpx.Timeout(connect=5.0, read=30.0, write=10.0)
     ```
   - The `httpx.Timeout` constructor requires either a positional default value OR all four named keyword arguments (`connect`, `read`, `write`, `pool`). Omitting `pool` while also omitting the positional default triggers an `AssertionError` inside `Timeout.__init__`.
   - Added `pool=5.0` with an explanatory comment to make the snippet functional.

## Review Notes
- The `ss -tlnp` example output shown in Step 3 prefixes the row with `tcp`, which does not appear in actual `ss -tlnp` output on modern iproute2 (the `-t` filter drops the Netid column). The column-pointer caret annotation is also somewhat cluttered. Left as-is because the information content (Recv-Q = current accept queue depth, Send-Q = backlog max on a LISTEN socket) is accurate and fixing purely cosmetic formatting was out of scope for a technical-correctness review.
- `except TimeoutError` is correct for Python 3.10+ where `socket.timeout` became an alias of the built-in `TimeoutError`. On older Python versions, `socket.timeout` would need to be caught instead, but targeting 3.10+ is reasonable in 2026.
- The `iptables -D ... -j DROP` deletion relies on an exact rule match; in practice users may need `iptables -D INPUT <rulenum>` when matching arguments aren't known. This is a usability caveat, not a technical error.
- `dmesg | grep "SYN flooding"` matches the kernel's actual log string ("possible SYN flooding on port X. Sending cookies" / "Dropping request") — accurate.
