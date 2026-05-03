# Validation Summary: How to Delete an ARP Entry with ip neigh del

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux iproute2 (`ip neigh` command)
- ARP (Address Resolution Protocol)
- Linux kernel neighbor table / NUD (Neighbor Unreachability Detection) states
- IPv4 networking

## Sources Consulted
- `ip neigh help` output from iproute2
- ip-neighbour(8) man page (https://man7.org/linux/man-pages/man8/ip-neighbour.8.html)
- Linux kernel networking documentation on neighbor states (NUD)
- RFC 826 (Address Resolution Protocol)

## Issues Found
No technical issues found.

All commands, syntax, and flags are verified correct against the iproute2 `ip neigh` usage:
- `ip neigh show` and `ip neigh show dev <iface>` — correct.
- `ip neigh del <ADDR> dev <iface>` — correct.
- `ip neigh flush dev <iface>` — correct.
- `ip neigh flush nud stale` — correct (kernel accepts `stale` as a valid NUD STATE).
- `ip neigh add <ADDR> lladdr <MAC> dev <iface> nud permanent` — correct syntax order.
- Example `ip neigh show` output format (`<ip> dev <iface> lladdr <mac> <STATE>`) matches actual iproute2 output.
- Listed NUD states (REACHABLE, STALE, DELAY, FAILED, PERMANENT) and their meanings are accurate.

## Review Notes
- The NUD state table is partial — the kernel also supports INCOMPLETE, PROBE, NOARP, and NONE states. The omission is reasonable for a how-to focused on deletion, but a future revision could note these for completeness.
- The post is IPv4-focused (per the title and tags), but `ip neigh` works identically for IPv6 (NDP) entries — worth mentioning in a future expansion.
- `arp -d` is the older deprecated equivalent (from net-tools); the post correctly steers readers to the modern iproute2 command.
