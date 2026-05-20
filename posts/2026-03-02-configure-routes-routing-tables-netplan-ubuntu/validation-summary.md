# Validation Summary: How to Configure Routes and Routing Tables with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu networking
- Netplan
- systemd-networkd
- Linux routing tables
- Linux policy-based routing
- iproute2 (`ip route`, `ip rule`)
- iptables packet marking

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip-rule(8)` manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Local `netplan generate --help`
- Local `ip route help`
- Local `ip rule help`

## Issues Found
- The special `blackhole`, `unreachable`, and `prohibit` route examples included `via: 0.0.0.0`. These route types do not need a gateway, and Linux `ip route` documents them as special route types rather than normal gatewayed routes. Removed the `via` fields.
- The custom routing table section said Linux supports up to 255 named routing tables and implied Netplan can use table names. The Linux `ip-route(8)` manual documents numeric table IDs in the range `1` to `2^32-1`, with reserved built-in values, while Netplan's `table` field accepts positive numeric IDs. Updated the text to describe numeric IDs and iproute2 name mappings accurately.
- The policy-based routing example used `via: 0.0.0.0` for connected link routes in custom tables. Netplan supports gatewayless link-scope routes, so the unnecessary `via` fields were removed.
- The mark-based routing example used `from: all` and `fwmark`. `netplan generate` rejects `from: all`, and the Netplan YAML key is `mark`, not `fwmark`. Changed the example to `from: 0.0.0.0/0` and `mark: 1234`.
- The VPN routing example routed through `10.8.0.1` under an Ethernet interface whose address was `192.168.1.100/24`, making the gateway unreachable from that interface. Updated the example to use a VPN router reachable on the local LAN (`192.168.1.10`) and kept the existing note that VPN clients usually add tunnel routes dynamically.

## Review Notes
Validated the complete Netplan examples and the partial route/policy snippets with `netplan generate --root-dir` after wrapping partial snippets in temporary interface configuration. The generated checks returned success; the only emitted message was an expected local systemd daemon-reload permission warning from running in a temporary root.
