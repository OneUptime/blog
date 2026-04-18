# Validation Summary: How to Tune Linux Kernel UDP Parameters for High Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel networking stack
- sysctl (net.core.*, net.ipv4.udp_mem)
- ethtool (ring buffers, RSS channels)
- IRQ affinity / smp_affinity bitmasks
- irqbalance
- SO_REUSEPORT socket option
- Busy polling (SO_BUSY_POLL, net.core.busy_poll, net.core.busy_read)
- nstat / UDP SNMP counters

## Sources Consulted
- Linux kernel networking docs: https://www.kernel.org/doc/Documentation/networking/scaling.txt
- Linux admin-guide sysctl/net: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux networking ip-sysctl (udp_mem format in pages): https://docs.kernel.org/networking/ip-sysctl.html
- ethtool(8) man page for -g/-G and -l/-L
- Kernel docs: Documentation/networking/napi.rst and busy polling write-ups (net.core.busy_poll / busy_read)
- Linux SO_REUSEPORT commit by Tom Herbert (kernel 3.9+) describing 4-tuple flow distribution
- socket(7) and udp(7) man pages (SO_RCVBUF, SO_SNDBUF, SO_REUSEPORT, SO_BUSY_POLL)
- /proc/net/snmp UDP counters including RcvbufErrors

## Issues Found
No technical issues found.

## Review Notes
- Default socket buffer of "212 KB" is approximate; most distros set `rmem_max`/`wmem_max` to 212992 bytes (~208 KB). Close enough to be correct in spirit.
- `ethtool -L eth0 combined $(nproc)` assumes the NIC supports combined channels equal to CPU count; hardware maximums vary (the post does acknowledge this for ring buffers).
- `net.ipv4.udp_mem` values are in 4 KB pages, as the comment indicates; the chosen values (400 MB / 3.4 GB / 64 GB) are aggressive and only suitable for large-memory servers.
- `net.core.netdev_budget = 600` doubles the typical default of 300; modern kernels also expose `netdev_budget_usecs` which could be mentioned for completeness in a future revision.
- IRQ affinity via `/proc/irq/<N>/smp_affinity` is correct; for systems with many CPUs, `smp_affinity_list` is sometimes easier. Not an error, just an alternative worth noting.
- The post correctly notes that stopping `irqbalance` is required before pinning IRQs manually, otherwise the daemon may override assignments.
