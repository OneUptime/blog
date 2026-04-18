# Validation Summary: How to Troubleshoot UDP Packet Loss

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered

- Linux networking stack (UDP)
- `iperf3` (UDP throughput and loss testing)
- `ping` (ICMP path testing)
- `/proc/net/udp` (per-socket UDP drop counter)
- `netstat -su` (UDP SNMP stats)
- `nstat` (SNMP counter deltas)
- `sysctl` / `net.core.rmem_max`, `rmem_default`, `wmem_max` (kernel socket buffer tunables)
- `SO_RCVBUF`, `SO_REUSEPORT` (socket options via `setsockopt`)
- Python `socket` module
- `ss` (socket statistics, `-m` memory info)
- `mtr` (path loss per hop)
- `ip -s link` (interface error/drop counters)
- `recvmmsg(2)` syscall

## Sources Consulted

- `man 7 socket` (SO_REUSEPORT, SO_RCVBUF semantics)
- `man 8 ss` (filter grammar, `-m` skmem output)
- `man 8 nstat` and live `nstat -a` output (counter names)
- `man 8 netstat` and live `netstat -su` output
- Linux kernel `Documentation/networking/` (proc_net docs, `/proc/net/udp` columns)
- Linux kernel source `net/core/sock.c` (`SK_RMEM_MAX` default 212992)
- `man 2 recvmmsg`
- `iperf3` `--help` (verified `-u`, `-b`, `-R`, `-t`, `-c`)
- `man 8 mtr` (`--report`, `--report-cycles`, `-n`)

## Issues Found

1. **Invalid sysctl `net.core.reuseport=1`.** The post recommended `sysctl -w net.core.reuseport=1` to enable SO_REUSEPORT. No such sysctl exists in the Linux kernel — `/proc/sys/net/core/` has no `reuseport` entry, and `SO_REUSEPORT` is purely a per-socket option set by the application via `setsockopt(2)` before `bind(2)` (documented in `man 7 socket`). Replaced the bogus sysctl line with a clarifying comment and a Python `setsockopt(... SO_REUSEPORT, 1)` example, matching the style used for `SO_RCVBUF` earlier in the post.

## Review Notes

- `ping -i 0.1` requires CAP_NET_RAW / root on Linux (non-root intervals are clamped to ≥ 0.2s). Not incorrect, but readers running as non-root may see a warning.
- The `ss -umn sport = :5000` filter syntax is correct and documented, though spacing around `=` is required.
- Modern Linux kernels still ship `net.core.rmem_max = 212992` (208 KiB) as the default, so the example values remain accurate for 5.x/6.x.
- The SNMP counter names (`UdpInErrors`, `UdpRcvbufErrors`, `UdpSndbufErrors`) are case-sensitive — matches `/proc/net/snmp` exactly.
- `recvmmsg()` advice is sound; readers may also consider `io_uring` or `AF_XDP` for higher-throughput use cases, though that's beyond the scope here.
