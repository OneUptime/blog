# Validation Summary: How to Tune TCP FIN_WAIT Timeout on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux kernel TCP stack
- `net.ipv4.tcp_fin_timeout` sysctl parameter
- `ss` (iproute2) socket statistics tool
- `sysctl` / `/etc/sysctl.conf`
- Python `socket` module (graceful shutdown pattern)
- TCP state machine (FIN_WAIT1, FIN_WAIT2, TIME_WAIT)

## Sources Consulted
- RFC 793 / RFC 9293 — TCP specification, connection termination and state diagram
- Linux kernel documentation — Documentation/networking/ip-sysctl.rst (`tcp_fin_timeout`, default 60s)
- Linux kernel source — `include/net/tcp.h` (`TCP_TIMEWAIT_LEN` fixed at 60s)
- iproute2 `ss` source — `misc/ss.c` timer name table (`off`, `on`, `keepalive`, `timewait`, `persist`)
- Linux kernel `net/ipv4/tcp.c` — orphaned FIN_WAIT2 sockets armed via keepalive-variant timer for `tcp_fin_timeout`
- Python 3 socket documentation — `socket.shutdown()`, `SHUT_WR`, `recv()` semantics
- `ss(8)` man page — state filters (`fin-wait-1`, `fin-wait-2`, `time-wait`) and `-o` timer output

## Issues Found
1. **Incorrect `ss` timer label for FIN_WAIT2 (first occurrence)** — The comment in the "Viewing FIN_WAIT Connections" block said to look for `timer:timewait` in `ss -o state fin-wait-2` output. This is wrong: `timer:timewait` only appears for sockets in the TIME_WAIT state. Orphaned FIN_WAIT2 sockets (the ones `tcp_fin_timeout` applies to) are armed with a keepalive-variant timer, so `ss` reports `timer:keepalive,Xsec`. Changed the comment to reference `timer:keepalive`.
2. **Incorrect `ss` timer label for FIN_WAIT2 (second occurrence)** — The "FIN_WAIT2 vs TIME_WAIT" block claimed `timer:on,Xsec = in FIN_WAIT2`. `timer:on` corresponds to the retransmit timer, not the FIN_WAIT2 timeout. Orphaned FIN_WAIT2 sockets show `timer:keepalive`. Updated the comment accordingly and noted that this applies to orphaned sockets.

## Review Notes
- Default `tcp_fin_timeout` of 60 seconds on Linux and `TCP_TIMEWAIT_LEN` of ~60 seconds are both accurate.
- The Python graceful-shutdown pattern is correct; minor nit: `sock.close()` does not itself emit a separate ACK for the remote FIN (the kernel already ACKed it on receipt), but this is a labeling nuance rather than a technical error and does not change the shown behavior.
- `ss ... | wc -l` over-counts by 1 due to the header row; this is a common idiom and not a correctness issue — using `-H` would be cleaner on iproute2 versions that support it.
- The claim that reducing `tcp_fin_timeout` to 30s is "RFC-compliant" is reasonable: no RFC specifies a maximum FIN_WAIT2 duration; this is a Linux-specific resource-protection knob.
- Non-orphaned FIN_WAIT2 (application called `shutdown(SHUT_WR)` but not `close()`) is not governed by `tcp_fin_timeout` — worth a future callout, but the post's framing around orphaned connections is the common case.
