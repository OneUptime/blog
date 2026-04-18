# Validation Summary: How to View ARP Cache Entries Using ip neigh on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux iproute2 (`ip neigh` command)
- ARP (Address Resolution Protocol, RFC 826)
- Linux NUD (Neighbor Unreachability Detection) state machine
- Linux kernel sysctl parameters (`net.ipv4.neigh.*`)
- tcpdump, journalctl, ping (supporting diagnostic tools)

## Sources Consulted
- `ip-neighbour(8)` man page (iproute2)
- Linux kernel documentation: `Documentation/networking/arp.rst` and `ip-sysctl.rst`
- RFC 826 (An Ethernet Address Resolution Protocol)
- RFC 4861 (Neighbor Discovery for IP version 6 - shares NUD state machine)
- Kernel source `include/net/neighbour.h` (NUD state constants)

## Issues Found
No technical issues found.

Verified:
- `ip neigh show`, `ip -4 neigh show`, `ip neigh show dev <iface>`, and `ip neigh show <addr>` are all valid (the man page lists `to PREFIX` as the canonical form, but bare address works as a shorthand).
- `ip neigh add/change/del/flush` syntax matches the man page synopsis.
- `nud permanent` is accepted as a valid state keyword on `ip neigh add`.
- `ip neigh flush dev <iface> nud stale` is valid.
- NUD states listed (REACHABLE, STALE, DELAY, PROBE, FAILED, PERMANENT, NOARP) are all valid per the iproute2 man page and kernel headers.
- Sample output format matches real `ip neigh show` output, including the FAILED-without-lladdr case.
- `net.ipv4.neigh.default.gc_thresh3` controls the hard ceiling on ARP cache entries (correct).
- `net.ipv4.neigh.<iface>.base_reachable_time_ms` is the correct per-interface parameter name in milliseconds (the deprecated `base_reachable_time` counterpart is in seconds).
- `tcpdump -i eth0 -n arp` and `journalctl -k | grep -i duplicate` are correct diagnostic commands.

## Review Notes
- The NUD table omits `INCOMPLETE` and `NONE` states, which also exist per the man page and kernel headers. These are transient states most users will not observe for long, so omission is a reasonable simplification for a practical tutorial.
- The `ip neigh show <addr>` form relies on the `to` keyword defaulting; `ip neigh get <addr> dev <iface>` is a more explicit alternative that also triggers resolution if the entry is missing — worth mentioning in a future revision.
- Setting `gc_thresh3=8192` globally via `net.ipv4.neigh.default` only affects interfaces created *after* the sysctl is applied; existing interfaces need per-interface tuning (`net.ipv4.neigh.<iface>.gc_thresh3`). This is a subtle caveat but not an error in the post.
- The post does not mention that changing sysctl values with `sysctl -w` is non-persistent across reboots; persistent configuration requires `/etc/sysctl.d/*.conf`. Could be added as a future improvement.
