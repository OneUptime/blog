# Validation Summary: How to List All Routing Tables and Rules on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- iproute2
- Routing tables
- Policy routing
- `ip route`
- `ip rule`

## Sources Consulted
- `iproute2` upstream release archive: https://www.kernel.org/pub/linux/utils/net/iproute2/iproute2-7.0.0.tar.xz
- `iproute2` upstream `ip-route(8)` manpage source from that archive: `man/man8/ip-route.8.in`
- `iproute2` upstream `ip-rule(8)` manpage source from that archive: `man/man8/ip-rule.8.in`
- `iproute2` upstream table-name lookup implementation from that archive: `lib/rt_names.c`
- `iproute2` upstream drop-in README from that archive: `etc/iproute2/rt_tables.d/README`
- Local command help output: `ip route help`, `ip rule help`
- Local manpages: `man 8 ip`, `man 8 ip-route`, `man 8 ip-rule`

## Issues Found
- The introduction said Linux routing tables are evaluated in priority order. I changed this to say policy routing rules are evaluated in priority order, which matches `ip-rule(8)`.
- The `rt_tables` section only read `/etc/iproute2/rt_tables`. I changed it to also read the standard `/usr/share/iproute2/rt_tables` location and `rt_tables.d` drop-ins, which matches upstream `iproute2` table-name lookup behavior.
- The packet-check section claimed `ip rule show | head -20` would trace which rule and table handles a specific packet. That command only lists rules; it does not perform a packet-specific lookup. I changed the comments to accurately describe inspecting rule order and using `ip route get` for the routing decision.
- The per-table counting loop parsed only explicit `table ...` markers from `ip route show table all`, which misses the main table because `iproute2` does not label main-table routes that way. I replaced the loop with one that includes `main`, `local`, and `default` explicitly and then adds any other table names found in the combined output.
- The multicast example used `ip route show table local type multicast`, which can return no output because the family defaults are context-dependent. I changed it to `ip -6 route show table local type multicast`, which correctly matches the common IPv6 local-table multicast route.

## Review Notes
- `ip route show table default` is syntactically valid, but the built-in `default` table is usually empty and can produce no routes or a table-missing message depending on system state.
- `ip route` family defaults are context-dependent. For IPv6-specific inspection, explicit `-6` usage is more reliable than relying on auto-detection.
