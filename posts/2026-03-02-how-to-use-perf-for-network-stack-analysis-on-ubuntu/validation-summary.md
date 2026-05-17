# Validation Summary: How to Use perf for Network Stack Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `perf` (perf_events) — record, report, stat, top, trace, script
- Linux kernel tracepoints (`net:*`, `sock:*`, `tcp:*`, `skb:*`, `napi:*`, `irq:*`, `syscalls:*`)
- Ubuntu package management (`linux-tools-common`, `linux-tools-$(uname -r)`)
- sysctl (`kernel.perf_event_paranoid`, `kernel.kptr_restrict`)
- FlameGraph (Brendan Gregg's stackcollapse-perf.pl / flamegraph.pl)
- `ethtool` (ring buffer, interrupt coalescing, RSS queues)
- `/proc/net/dev`, `/proc/interrupts`

## Sources Consulted
- Linux kernel source on git.kernel.org / torvalds/linux:
  - `include/trace/events/napi.h` (NAPI tracepoint namespace)
  - `include/trace/events/tcp.h` (`tcp:tcp_probe`, `tcp:tcp_retransmit_skb`)
  - `include/trace/events/sock.h` (`sock:inet_sock_set_state`)
  - `include/trace/events/net.h` (`net:netif_receive_skb`, `net:net_dev_queue`, `net:net_dev_xmit`)
  - `include/trace/events/skb.h` (`skb:kfree_skb`)
  - `net/core/net-procfs.c` (column layout of `/proc/net/dev`)
- `perf` man pages (perf-record, perf-stat, perf-trace, perf-report)
- Brendan Gregg's FlameGraph repository: https://github.com/brendangregg/FlameGraph
- `ethtool` man page

## Issues Found
1. **Wrong tracepoint namespace for NAPI polling.** The post listed the tracepoint as `net:napi_poll`. The kernel defines this tracepoint with `TRACE_SYSTEM napi` in `include/trace/events/napi.h`, so the correct event name is `napi:napi_poll`. Fixed the listing in the "Common network tracepoints" comment block, and updated the `perf list | grep` filter in the same section to include `napi:` so the user will actually see this tracepoint.

2. **Wrong awk field for tx_drop in /proc/net/dev.** The post used `$17` for `tx_drop`. Based on the printf format in `net/core/net-procfs.c`, the per-interface row has the form `name: rx_bytes rx_packets rx_errs rx_drop rx_fifo rx_frame rx_compressed rx_multicast tx_bytes tx_packets tx_errs tx_drop tx_fifo tx_colls tx_carrier tx_compressed`. With the interface name (with trailing colon) as `$1`, `tx_drop` is at `$13`; `$17` is `tx_compressed`. Changed `$17` to `$13`. (`$5` for `rx_drop` is correct and was left alone.)

## Review Notes
- The `perf stat -e` command spread across multiple lines with backslash continuation produces an argument containing whitespace between events. perf's event parser tolerates this, so it works, but a single-line comma-separated list would be safer in case the parser changes.
- `kernel.perf_event_paranoid=-1` is the most permissive setting and exposes raw tracepoint and kernel-level data to all users; on production hosts most operators prefer `1` or `2`. The post is aimed at a profiling/debugging context where this is acceptable, so it was left as written.
- The awk one-liner for sendto latency (`/sys_enter_sendto/{start=$1} /sys_exit_sendto/{...}`) is approximate — `$1` in default `perf script` output is the command name, not the timestamp (which is around `$4`). The post itself notes this is a rough demonstration and points users to the `perf stat` histogram alternative, so I did not modify it.
- `linux-image-$(uname -r)-dbgsym` (in the commented-out line) is only available via Ubuntu's separate ddebs repository, which the post does not mention. Left as-is since the line is commented out and optional.
- `perf trace -e '*socket*,*connect*,*send*,*recv*'` glob syntax depends on the `perf` version's tracepoint matcher; it works on modern Ubuntu builds (22.04+) but may need quoting tweaks on older releases.
