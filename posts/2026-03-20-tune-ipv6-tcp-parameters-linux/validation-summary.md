# Validation Summary: How to Tune IPv6 TCP Parameters on Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Linux kernel TCP stack (IPv4/IPv6)
- sysctl and /etc/sysctl.d configuration
- BBR congestion control
- TCP Fast Open (TFO)
- TCP keepalive, TIME_WAIT, FIN_WAIT_2 tuning
- Python `socket` module (IPv6 AF_INET6 socket, TCP_FASTOPEN setsockopt)
- `ss`, `netstat`, `/proc/net/snmp6` diagnostics

## Sources Consulted
- Linux kernel documentation: Documentation/networking/ip-sysctl.rst (tcp_congestion_control, tcp_fastopen, tcp_tw_reuse, tcp_fin_timeout, tcp_keepalive_*, tcp_abort_on_overflow, tcp_mem, tcp_syn_retries, tcp_synack_retries, tcp_max_orphans, tcp_max_tw_buckets, ip_local_port_range, tcp_timestamps)
- BBR congestion control availability: merged in Linux kernel 4.9 (https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=0f8782ea)
- RFC 7413 — TCP Fast Open
- RFC 6298 — Computing TCP's Retransmission Timer
- Python docs: `socket` module — https://docs.python.org/3/library/socket.html (AF_INET6 address 4-tuple, SOL_TCP, TCP_FASTOPEN)
- `ss(8)` and `netstat(8)` man pages

## Issues Found
1. **Incorrect comment on `tcp_abort_on_overflow`** (Step 3). The original comment read "Abort connections waiting for client data after N seconds", which is incorrect — `tcp_abort_on_overflow` is a boolean that controls whether the kernel resets connections when the listen accept queue overflows; it has nothing to do with a per-connection idle timeout, and the value is not measured in seconds. Replaced the comment with "If listen queue overflows, send RST (1) or silently drop (0)" to match the kernel documentation.

## Review Notes
- BBR pairing with `fq` is the conventional recommendation for BBR v1; on newer kernels BBR can coexist with other qdiscs (e.g. `fq_codel`), but `fq` remains the safe default, so the guidance is sound.
- `net.ipv4.ip_local_port_range = 1024 65535` is aggressive — ports below ~10000 often collide with listening services and `ip_local_reserved_ports`. Not incorrect but operators should audit for port conflicts before applying.
- `tcp_tw_reuse` default was 0 historically; on kernels >= 4.12 the default is effectively 2 (loopback only). The "default 0" in the summary table is close enough for practical tuning purposes.
- `tcp_fastopen` server-side acceptance on a listening socket additionally requires `setsockopt(IPPROTO_TCP, TCP_FASTOPEN, qlen)`; the Python example correctly does this (using `socket.SOL_TCP`, which on Linux is equal to `IPPROTO_TCP = 6`).
- The IPv6 bind 4-tuple `("::", 8080, 0, 0)` (host, port, flowinfo, scopeid) is the correct form for AF_INET6.
- `tcp_mem` values are in 4KiB pages; the chosen values (≈3 GiB / 4 GiB / ≈102 GiB) are only appropriate on large-memory servers — operators should scale these to host RAM rather than copy-pasting.
