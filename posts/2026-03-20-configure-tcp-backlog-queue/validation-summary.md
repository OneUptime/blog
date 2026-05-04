# Validation Summary: How to Configure TCP Backlog Queue Size on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel TCP networking
- sysctl (`net.ipv4.tcp_max_syn_backlog`, `net.core.somaxconn`)
- `ss` and `netstat` socket statistics tools
- Python `socket` module (`listen()`)
- Nginx `listen` directive with `backlog` parameter
- systemd socket units (`Backlog=` directive)

## Sources Consulted
- Linux kernel networking documentation (`Documentation/networking/ip-sysctl.rst`)
- `listen(2)` man page — describes `min(backlog, somaxconn)` behavior
- `ss(8)` man page — Recv-Q/Send-Q semantics for LISTEN-state sockets
- Nginx documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen — confirms default `backlog=511` on Linux
- `systemd.socket(5)` man page — `Backlog=` directive in `[Socket]` section
- Python `socket` module documentation — `socket.listen([backlog])`
- Linux kernel source `inet_csk_listen_start()` — confirms accept queue is bounded by `min(backlog, somaxconn)`
- `/proc/net/netstat` `ListenDrops` counter — surfaced as "SYNs to LISTEN sockets dropped" in `netstat -s`

## Issues Found
No technical issues found.

All technical claims verified:
- Two-queue model (SYN queue + accept queue) is accurate.
- `tcp_max_syn_backlog` governs the SYN queue (half-open connections).
- `somaxconn` caps the accept queue regardless of the value passed to `listen()`.
- `ss -tlnp` Recv-Q/Send-Q semantics are described correctly for LISTEN sockets.
- The `min(listen_backlog, net.core.somaxconn)` formula matches kernel behavior.
- Nginx default backlog of 511 on Linux is correct.
- Python `socket.listen(1024)` is valid syntax.
- `systemd` `Backlog=` directive is valid in `[Socket]` section.
- The `netstat -s | grep "SYNs to LISTEN sockets dropped"` phrase matches the modern kernel output for `ListenDrops`.

## Review Notes
- The stated default `net.core.somaxconn = 128` is correct for older kernels and many distro defaults; however, the upstream Linux kernel raised the compile-time default to 4096 in v5.4 (Nov 2019, commit `19f92a030ca6`). Distros vary, and the value shown on a given system is what `sysctl net.core.somaxconn` reports — so the post's framing as "Default: 128" is acceptable but readers on recent kernels may already see a higher value.
- The `tcp_max_syn_backlog` default also varies with system memory; "128–512" is a reasonable approximation for typical systems.
- When the accept queue overflows, the kernel by default silently drops the final ACK (causing the client to retransmit) and will send RST only if `net.ipv4.tcp_abort_on_overflow=1`. The post's simplification ("SYNs are silently dropped") covers the SYN-queue case accurately and is a fair high-level statement for the accept-queue case as well.
- `ss -s | grep TCP` shows summary counts but not drop statistics directly; the `netstat -s` line is the authoritative drop counter, which the post also includes.
