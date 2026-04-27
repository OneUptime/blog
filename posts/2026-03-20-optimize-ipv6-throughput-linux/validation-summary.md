# Validation Summary: How to Optimize IPv6 Throughput on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel networking stack (IPv6)
- sysctl kernel parameters (`net.core.*`, `net.ipv4.tcp_*`, `net.ipv6.*`)
- TCP buffer tuning (`rmem`, `wmem`, `tcp_rmem`, `tcp_wmem`)
- TCP options (window scaling, SACK)
- ethtool (offloads: TSO, GSO, GRO, LRO; RSS via channels)
- IPv6 neighbor discovery / router solicitations
- iperf3, ss, netstat for verification

## Sources Consulted
- Linux kernel networking sysctl documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux man pages: `socket(7)`, `tcp(7)`, `ss(8)`, `ethtool(8)`, `sysctl(8)`
- Linux kernel commit history regarding `tcp_fack` removal in 4.15 (commit `656d98b09d` — "tcp: remove FACK")
- Live verification of sysctl entries on a current Linux kernel (6.x)

## Issues Found
1. **Removed deprecated `net.ipv4.tcp_fack`** — FACK was effectively removed from the Linux TCP stack in kernel 4.15 (Sep 2017, commit `656d98b09d`). The sysctl name is retained as a no-op for ABI compatibility, but setting it to 1 has no effect on modern kernels. RACK-TLP (controlled via `net.ipv4.tcp_recovery`, enabled by default) replaced FACK. Removed the line and its comment to avoid misleading readers.
2. **Corrected the comment for `net.core.netdev_max_backlog`** — The original comment described it as "the maximum number of packets in the NIC tx queue", which is wrong. Per `man 7 socket` and the kernel docs, this knob sizes the per-CPU softnet **receive (input)** backlog used between the NIC driver (post-NAPI) and the network stack. Transmit queues are sized via `txqueuelen` / qdiscs. Updated the comment to reflect this.

## Review Notes
- The claim that `net.ipv4.tcp_*` settings apply to IPv6 TCP is correct — there is no separate `net.ipv6.tcp_*` namespace; the TCP stack is shared across address families.
- `net.ipv6.neigh.<interface>.gc_stale_time` is valid per-interface; `gc_thresh1/2/3` only exist under `default`. The post correctly applies `gc_thresh*` only to `default`.
- `net.ipv6.conf.<interface>.router_solicitations` is valid; setting it to 0 disables RS on that interface.
- All `ethtool -K` / `-L` syntax is correct.
- `ss -6 -tmie` flag combination is valid (`-t` TCP, `-m` socket memory, `-i` internal TCP info, `-e` extended info).
- The 256 MB max buffer values are aggressive — appropriate for high-BDP paths, but readers on memory-constrained systems should size them to the actual bandwidth-delay product.
- `tcp_rmem` default of `87380` and `tcp_wmem` default of `65536` align with historical Linux defaults.
- LRO is correctly noted as "if supported" — many drivers do not support it or have it disabled by default in favor of GRO.
