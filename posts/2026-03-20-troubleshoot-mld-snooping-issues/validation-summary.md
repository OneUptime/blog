# Validation Summary: How to Troubleshoot MLD Snooping Issues

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- IPv6 Multicast Listener Discovery (MLD/MLDv2)
- Linux bridge multicast snooping (iproute2 `bridge`, `ip link`)
- Linux bridge sysfs multicast attributes
- Cisco IOS/NX-OS MLD snooping
- tcpdump / BPF filters on ICMPv6
- IPv6 NDP / Router Advertisement multicast groups

## Sources Consulted
- RFC 2710 — Multicast Listener Discovery (MLDv1)
- RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2)
- RFC 2711 — IPv6 Router Alert Option (Hop-by-Hop, required for MLD)
- RFC 4291 — IPv6 Addressing Architecture (multicast scopes, `ff02::1`, `ff02::2`)
- Linux kernel source `net/bridge/br_sysfs_br.c` and `net/bridge/br_multicast.c` (sysfs attribute names and `clock_t_to_jiffies` unit conversion)
- iproute2 source: `bridge/mdb.c`, `ip/iplink_bridge.c`, `ip/iplink_bridge_slave.c`
- `bridge(8)` and `ip-link(8)` man pages
- `pcap-filter(7)` man page (`ip6[]`, `ip6 protochain`, `icmp6` primitive)
- Cisco Nexus 9000 / NX-OS MLD snooping configuration guide (`link-local-groups-suppression` command)
- Cisco Catalyst IOS-XE MLD snooping configuration guide

## Issues Found

1. **Sysfs paths used the `mcast_` prefix instead of `multicast_`.** The kernel exposes these attributes under `/sys/class/net/br0/bridge/multicast_*` (see `net/bridge/br_sysfs_br.c`). The `mcast_` short form only exists in the netlink/iproute2 API. Fixed three occurrences: `mcast_querier` → `multicast_querier` (twice) and `mcast_querier_intvl` → `multicast_query_interval` in the "verify querier is running" snippet.

2. **Incorrect units for `mcast_query_interval` and `mcast_membership_interval`.** Both are expressed in centiseconds (USER_HZ ticks) via `clock_t_to_jiffies()`. The defaults are `12500` (125 s) and `26000` (260 s). The post used `125` and `260`, which would set the intervals to 1.25 s and 2.6 s — far too short and guaranteed to break MLD. Updated to `12500` and `26000` and added a comment explaining the unit.

3. **Invalid `bridge mdb show router` subcommand.** `bridge mdb` only accepts `add | del | show | replace | get | flush` — there is no `router` subcommand. Replaced with `bridge -d mdb show` (the `-d`/details flag surfaces router-port info) in both the Problem 2 diagnosis and the diagnostic script.

4. **Invalid `bridge mdb add/del ... router port ...` syntax.** Router ports are not managed through `bridge mdb`; they are a per-brport attribute (`mcast_router`, values 0/1/2). Replaced with the correct commands: `bridge link set dev eth0 mcast_router 2` (designate permanent router port) and `bridge link set dev eth1 mcast_router 0` (force non-router).

5. **Misleading "fast-leave" comment + fix under Problem 2 Cause 2.** `mcast_last_member_interval 100` is the default (1 s last-member query interval) and is not fast-leave — and neither setting actually addresses "unknown multicast flooding." Replaced with a static MDB entry example (`bridge mdb add dev br0 port eth2 grp ff3e::stream permanent`), which does prevent unknown-group flooding for the specific stream.

6. **tcpdump filters would miss compliant MLD traffic.** MLD packets are required (RFC 2710/3810 + RFC 2711) to carry a Hop-by-Hop Router Alert option. With the HBH header present, `ip6[40]` is the HBH Next Header byte (0x3a = 58), not the ICMPv6 type; and pcap's `icmp6` primitive does not chase extension headers. The filters `icmp6 and ip6[40] == 131` (etc.) therefore match nothing in practice. Replaced all three tcpdump filters with `ip6 protochain 58 and ip6[48] == <type>`, which correctly accounts for the 8-byte HBH header so the ICMPv6 type lands at offset 48.

7. **Cisco `ipv6 mld snooping vlan 100 link-local-groups-suppression` was scoped wrongly.** This command exists on Cisco Nexus/NX-OS but not on classic Catalyst IOS/IOS-XE. Updated the snippet to scope it to NX-OS and note that Catalyst platforms require consulting the platform's own guide.

8. **Cisco querier address `2001:db8::switch`.** "switch" is not valid hex. Changed to `2001:db8::1` so the example actually parses; documentation addresses under `2001:db8::/32` are reserved (RFC 3849) for exactly this purpose.

## Review Notes

- `ff3e::stream` is kept as an illustrative placeholder in a couple of places, but note "stream" is not valid hex. Readers must substitute a real group such as `ff3e::1:2:3`. Intent is clear from context.
- The post uses Linux bridge and Cisco as its two concrete examples but the troubleshooting logic applies to most L2 switches; no change needed.
- `bridge mdb show` output formatting and the availability of `-d` vary slightly across iproute2 versions (5.x+), but the commands used here are supported in current distributions.
- On per-port multicast control, Linux also exposes `bridge link set dev X mcast_flood off` to suppress unknown multicast on a specific port; this wasn't mentioned but isn't wrong to omit.
