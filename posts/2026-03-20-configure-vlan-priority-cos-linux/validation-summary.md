# Validation Summary: How to Configure VLAN Priority (CoS) on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IEEE 802.1Q VLAN tagging
- IEEE 802.1p Class of Service (CoS) / PCP field
- Linux `iproute2` (`ip link`) VLAN QoS maps (egress-qos-map / ingress-qos-map)
- Linux Traffic Control (`tc`) — `prio` qdisc, `u32` filter, `skbedit` action
- systemd-networkd `.netdev` VLAN configuration

## Sources Consulted
- `ip-link(8)` man page (iproute2) — VLAN egress-qos-map / ingress-qos-map syntax
- `systemd.netdev(5)` man page — VLAN section options (GVRP, MVRP, EgressQOSMaps, IngressQOSMaps)
- systemd source `src/network/netdev/vlan.c` (`config_parse_vlan_qos_maps`) — https://github.com/systemd/systemd/blob/main/src/network/netdev/vlan.c
- systemd source `src/basic/parse-util.c` (`parse_range`) — confirms `-` (hyphen) is the separator used by the QoS map parser
- systemd `man/systemd.netdev.xml` upstream documentation
- IEEE 802.1Q / 802.1D priority value recommendations (network control, voice, video, etc.)
- Linux kernel `tc-skbedit(8)` and `tc-u32(8)` man pages for the filter syntax

## Issues Found
- **systemd-networkd QoS map separator was wrong.** The post's `[VLAN]` section had `EgressQOSMaps=0:0 6:5 7:6` and `IngressQOSMaps=5:6 6:7` using a colon. The systemd parser (`parse_range` in `parse-util.c`) splits on a hyphen, and the official `systemd.netdev(5)` documentation specifies the format as `from-to` (example: `21-7 45-5`). I changed the values to `EgressQOSMaps=0-0 6-5 7-6` and `IngressQOSMaps=5-6 6-7`. With colons, systemd-networkd would log a parse warning and silently ignore the maps, leaving the kernel default in place — a subtle, hard-to-diagnose failure.

## Review Notes
- The `ip link set ... type vlan egress-qos-map`/`ingress-qos-map` CLI form (used in the bash sections of the post) does use a colon separator (`from:to`) — that part is correct, and intentionally different from the systemd-networkd file format. The two tools genuinely use different separators, which is a common source of confusion.
- The 802.1p priority table is sorted by CoS value descending; semantically priority 1 (Background) is actually treated as *lower* than priority 0 (Best Effort) per IEEE 802.1D, but the value-to-traffic-class assignments shown are correct.
- The man page text for `EgressQOSMaps=`/`IngressQOSMaps=` claims integers must be in the range `1...4294967294` and that "from" must be ≥ "to". In practice, `parse_range` accepts `0` and does not enforce ordering, so the `0-0` mapping and the ingress entries (where `from < to`, e.g. `5-6`) work as intended on current systemd versions. This is the conventional way these maps are written.
- Calling `ip link set ... egress-qos-map` multiple times with single `from:to` pairs (as the post does) is additive — each call adds an entry to the map rather than replacing the table. The single-call form `ip link set eth0.100 type vlan egress-qos-map "0:0 6:5 7:6"` is equivalent and slightly more idiomatic, but not required.
- The `tc filter` example uses `action skbedit priority 6`. Note that `skbedit` requires the `act_skbedit` kernel module (usually auto-loaded). On minimal kernels this may need to be loaded explicitly.
- The post correctly notes that CoS is only meaningful end-to-end when the downstream switch trusts/honors 802.1p markings.
