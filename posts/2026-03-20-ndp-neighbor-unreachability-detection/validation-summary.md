# Validation Summary: How to Understand Neighbor Unreachability Detection (NUD)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Neighbor Unreachability Detection (NUD)
- ICMPv6 (Neighbor Solicitation type 135, Neighbor Advertisement type 136, Destination Unreachable type 1 code 3)
- Linux kernel `/proc/sys/net/ipv6/neigh/<iface>/*` parameters
- `iproute2` (`ip -6 neigh`), `iputils` (`ping6`), `tcpdump`, `sysctl`

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §7.3 (Neighbor Unreachability Detection), §7.2.5 (Receipt of Neighbor Advertisements), §10 (Protocol Constants)
- RFC 4443 — ICMPv6 (Type 1, Code 3 = Address Unreachable)
- Linux kernel networking documentation: `Documentation/networking/ip-sysctl.txt` (neigh parameters: `base_reachable_time_ms`, `delay_first_probe_time`, `retrans_time_ms`, `ucast_solicit`, `mcast_solicit`, `locktime`)
- `linux/neighbour.h` (NUD_INCOMPLETE, NUD_REACHABLE, NUD_STALE, NUD_DELAY, NUD_PROBE, NUD_FAILED)
- `tcpdump` / `pcap-filter(7)` man page

## Issues Found
1. **Mermaid state-transition diagram: `STALE --> REACHABLE : Unsolicited NA with O=1 received`** — Incorrect per RFC 4861 §7.2.5. An *unsolicited* Neighbor Advertisement (S=0) with the Override flag set only updates the cached link-layer address; it does NOT move the entry to REACHABLE. Only a *solicited* NA (S=1) sets the state to REACHABLE. Changed the transition label to `Solicited NA received`.
2. **Timing example math inconsistency: "Total FAILED detection: ~4 seconds (1s DELAY + 2×0.5s probes)"** — The arithmetic `1 + 2×0.5 = 2`, not 4. With `delay_first_probe_time=1`, `ucast_solicit=2`, and `retrans_time_ms=500`, total time from entering DELAY to FAILED is ~2 seconds. Corrected the comment to read `~2 seconds`.

## Review Notes
- The post uses the `FAILED` state, which is Linux-specific (`NUD_FAILED` in `linux/neighbour.h`); RFC 4861 itself does not name a FAILED state — when probes are exhausted the RFC says the entry SHOULD be deleted. Using "FAILED" is reasonable and matches what users see in `ip -6 neigh show`, so left as-is.
- `ping6` is the legacy iputils command name; modern iputils unify it into `ping`, but `ping6` still works on most current distributions. Acceptable as written.
- The `tcpdump` filters use `ip6[40] == 135/136` which correctly identifies ICMPv6 NS/NA only when there are no IPv6 extension headers. This is the standard pattern in NDP captures and was left unchanged.
- The `sysctl` keys with `eth0` embedded (e.g., `net.ipv6.neigh.eth0.base_reachable_time_ms`) work for plain interface names but break on names containing dots (e.g., VLANs `eth0.10`); that's a minor caveat, not an error.
- Default protocol constants quoted (REACHABLE_TIME 30s, RETRANS_TIMER 1s, DELAY_FIRST_PROBE_TIME 5s, MAX_UNICAST_SOLICIT 3, MIN/MAX_RANDOM_FACTOR 0.5/1.5) all match RFC 4861 §10.
- The ICMPv6 Destination Unreachable Code 3 (Address Unreachable) reference matches RFC 4443 and RFC 4861 §7.2.2.
