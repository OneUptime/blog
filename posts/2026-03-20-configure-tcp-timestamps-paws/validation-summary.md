# Validation Summary: How to Configure TCP Timestamps for PAWS Protection

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel networking stack
- TCP protocol (RFC 1323 / RFC 7323)
- TCP timestamps option (TSval / TSecr)
- PAWS (Protection Against Wrapped Sequence numbers)
- `sysctl` and `/etc/sysctl.d/` configuration
- `tcpdump` and `tshark` packet capture
- `nstat` and `/proc/net/netstat` SNMP counters
- NAT and `tcp_tw_reuse` interaction

## Sources Consulted
- Linux kernel `Documentation/networking/ip-sysctl.rst` (current master) — for `tcp_timestamps` and `tcp_window_scaling` semantics
- Linux kernel `include/uapi/linux/snmp.h` — for `LINUX_MIB_PAWSESTABREJECTED` and `LINUX_MIB_PAWSACTIVEREJECTED` definitions
- Linux kernel `net/ipv4/proc.c` — for exported counter names (`PAWSEstab`, `PAWSActive`)
- RFC 1323 (TCP Extensions for High Performance, May 1992)
- RFC 7323 (TCP Extensions for High Performance, September 2014 — obsoletes RFC 1323)

## Issues Found

1. **Incorrect meaning of `tcp_timestamps=2`.** The post claimed value `2` meant "enabled, but no timestamp on loopback". Per current kernel `ip-sysctl.rst`, value `2` actually means "Like 1, but without random offsets" (i.e., timestamps enabled but using current time directly instead of randomized per-connection offsets). Updated the inline comment to reflect the correct semantics, and clarified value `1` as "enabled with random per-connection offsets".

2. **False claim that timestamps are required for window scaling.** The post said `# Enable timestamps (required for window scaling and PAWS)`. TCP window scaling is governed by the independent sysctl `net.ipv4.tcp_window_scaling` and has no dependency on timestamps. Both options happen to be defined in the same RFC (1323/7323), but PAWS is the only feature that actually requires timestamps. Removed the window-scaling claim from the comment.

## Review Notes
- The post references RFC 1323. RFC 1323 was obsoleted by RFC 7323 in 2014, but the kernel documentation itself still references "RFC1323" by name, so this is consistent with prevailing convention and was left unchanged.
- The `nstat TcpExtPAWSActive` counter is still present in current Linux kernels (5.x/6.x) — `LINUX_MIB_PAWSACTIVEREJECTED` remains defined in `include/uapi/linux/snmp.h` and is exported as `PAWSActive` in `/proc/net/netstat`. The command is correct.
- The "10 bytes of overhead" figure refers to the timestamp option payload itself (Kind+Length+TSval+TSecr = 1+1+4+4). In practice the option is usually preceded by 2 NOP bytes for 4-byte alignment, totalling 12 bytes on the wire. Not strictly wrong — left as-is.
- The privacy claim about timestamps revealing OS uptime is largely mitigated when `tcp_timestamps=1` (default) since random per-connection offsets are used. Worth noting for a future revision but not technically incorrect as a general statement.
