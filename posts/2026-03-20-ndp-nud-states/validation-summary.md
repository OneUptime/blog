# Validation Summary: How to Understand NUD States (REACHABLE, STALE, DELAY, PROBE)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Neighbor Unreachability Detection (NUD) state machine
- Linux IPv6 neighbor cache (`ip -6 neigh`)
- Linux sysctl tunables under `/proc/sys/net/ipv6/neigh/<iface>/`
- ICMPv6 (Neighbor Solicitation, Destination Unreachable)
- `tcpdump` BPF filtering for ICMPv6
- `ping6` / `iputils`

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §6.3.2 (Host Variables), §7 (Address Resolution and Neighbor Unreachability Detection), §7.3.2 (Neighbor Cache states), §7.3.3 (Node Behavior), §10 (Protocol Constants)
- RFC 4443 — ICMPv6, §3.1 (Destination Unreachable Message; Code 3 = "Address unreachable")
- RFC 4291 — IPv6 Addressing Architecture (solicited-node multicast prefix)
- RFC 8200 — IPv6 Specification (40-byte fixed header)
- Linux kernel `Documentation/networking/ip-sysctl.rst` (`mcast_solicit`, `ucast_solicit`, `base_reachable_time_ms`, `retrans_time_ms`, `delay_first_probe_time`, `gc_stale_time`)
- iproute2 `ip-neighbour(8)` man page (default state for `ip neigh add` is PERMANENT)

## Issues Found
- **Misleading parenthetical for static entries (lines 68–70).** The comment for `ip -6 neigh add ...` read "(always REACHABLE)", which conflates the operational meaning ("always considered reachable for forwarding") with the kernel state name. Manually-added entries land in the **PERMANENT** state, not REACHABLE — and the very next line greps for `PERMANENT`. Updated the comment to: "Add a static entry (never expires; state will be PERMANENT, not REACHABLE)" to remove the contradiction with the section heading and the grep that follows.

## Review Notes
- The five RFC 4861 states (INCOMPLETE, REACHABLE, STALE, DELAY, PROBE) plus Linux's FAILED extension are described correctly, including the 0.5×–1.5× randomization of REACHABLE_TIME (RFC 4861 §6.3.2: MIN_RANDOM_FACTOR / MAX_RANDOM_FACTOR), the STALE → DELAY → {REACHABLE | PROBE} transitions, and the PROBE-state use of unicast NS (RFC 4861 §7.3.3).
- All cited Linux defaults match the kernel: `base_reachable_time_ms=30000`, `delay_first_probe_time=5`, `mcast_solicit=3`, `ucast_solicit=3`, `retrans_time_ms=1000`, `gc_stale_time=60`.
- The tcpdump filter `icmp6 and ip6[40] == 135 and not dst ff02::/16` is correct: IPv6 fixed header is 40 bytes (RFC 8200), byte 0 of ICMPv6 is the Type field, and 135 = Neighbor Solicitation. Solicited-node multicast addresses (ff02:0:0:0:0:1:ff00::/104) sit inside ff02::/16, so excluding the wider /16 correctly drops multicast NS while keeping unicast PROBE-state NS — which is the author's stated intent. The filter does assume no IPv6 extension headers; in environments with HBH/Routing headers, `ip6[40]` would not point at the ICMPv6 type byte. This is a minor caveat, not an error.
- `ICMPv6 Destination Unreachable Code 3` is correctly described as the code emitted when address resolution fails (RFC 4443 §3.1 "Address unreachable").
- `ping6` is being phased out in favor of `ping -6` in newer iputils, but `ping6` is still present on most distros — no change needed.
- For very-fast failure detection, also consider lowering `base_reachable_time_ms` together with `delay_first_probe_time`, as the post recommends; this is already covered in the conclusion.
