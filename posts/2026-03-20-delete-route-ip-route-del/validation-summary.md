# Validation Summary: How to Delete a Route with ip route del

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux `ip` command (iproute2 utility suite)
- Linux kernel routing table (IPv4)
- RTNETLINK
- Netplan, NetworkManager, `/etc/network/interfaces` (persistence mechanisms)

## Sources Consulted
- iproute2 `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 source / documentation: https://github.com/iproute2/iproute2
- Linux kernel routing documentation: https://docs.kernel.org/networking/index.html
- Netplan documentation: https://netplan.io/reference/
- NetworkManager documentation: https://networkmanager.dev/docs/

## Issues Found
No technical issues found.

All commands and syntax verified against the `ip-route(8)` man page:
- `ip route show`, `ip route show <prefix>`, `ip route get <addr>` — correct usage.
- `ip route del default`, `ip route del default via <gw>` — correct.
- `ip route del <prefix>`, `ip route del <prefix> via <gw>`, `ip route del <prefix> via <gw> dev <iface>` — correct.
- `ip route flush dev <iface>` — correct way to remove all routes on an interface.
- `ip route del blackhole <prefix>` — correct syntax for special route types.
- `ip route replace <prefix> via <gw>` — correct.
- The `RTNETLINK answers: No such process` error message and its meaning (route specification did not match) is accurate.
- The note that `ip route del` changes are not persistent across reboots is correct.

## Review Notes
- The section title "Removing Blackhole and Unreachable Routes" mentions both blackhole and unreachable routes, but the example only shows blackhole. An `unreachable` example (e.g., `sudo ip route del unreachable 198.51.100.0/24`) could be added for completeness, but this is a presentation suggestion rather than a technical error.
- The post focuses on IPv4 (as advertised in the description and tags). For IPv6 routes the same syntax applies with `ip -6 route del ...`, but this is intentionally out of scope.
- The example IPs used (`192.0.2.0/24`, `8.8.8.8`, RFC1918 ranges) are appropriate documentation/example addresses.
