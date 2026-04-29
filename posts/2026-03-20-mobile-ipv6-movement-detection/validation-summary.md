# Validation Summary: How to Understand Mobile IPv6 Movement Detection

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Mobile IPv6 (RFC 6275)
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Advertisements (ICMPv6 type 134)
- Neighbor Unreachability Detection (NUD)
- Linux IPv6 neighbor sysctls (`net.ipv6.neigh.*`)
- tcpdump BPF filters
- UMIP / mip6d (Mobile IPv6 Linux daemon)
- NetworkManager dispatcher hooks
- iproute2 (`ip monitor`)
- Python (illustrative pseudo-code)

## Sources Consulted
- [RFC 6275 — Mobility Support in IPv6](https://www.rfc-editor.org/rfc/rfc6275) (especially Section 11.5.1, "Movement Detection")
- [Linux kernel `Documentation/networking/ip-sysctl.rst`](https://raw.githubusercontent.com/torvalds/linux/master/Documentation/networking/ip-sysctl.rst) — for `delay_first_probe_time`, `ucast_solicit`, `retrans_time_ms` semantics and units
- `arp(7)` man page — neighbor discovery sysctl behavior
- [`mip6d.conf(5)` man page](https://www.systutorials.com/docs/linux/man/5-mip6d.conf/) — UMIP configuration directives
- iputils project (`ping6` / `ping -6` consolidation)
- tcpdump / libpcap filter expression documentation

## Issues Found

1. **Incorrect sysctl unit and parameter for "probe every 1 second"** — The original used `net.ipv6.neigh.eth0.delay_first_probe_time=1000` with the comment "1 second". This sysctl is in **seconds**, so `=1000` would mean 1000 seconds, not 1 second. Furthermore, the surrounding comment ("Probe every 1 second") describes the NS retransmit interval, which is governed by `retrans_time_ms` (milliseconds), not `delay_first_probe_time`. Replaced with `sysctl net.ipv6.neigh.eth0.retrans_time_ms=1000  # 1 second between probes`, which correctly matches the stated intent.

2. **`MovementDetectionMode` is not a real UMIP directive** — The post showed a `MovementDetectionMode 1;` config option in `/etc/mip6d.conf` with a "0 = lazy / 1 = eager" mapping. This directive does not exist in `mip6d.conf(5)`; UMIP exposes movement-detection tuning through `MnRouterProbes` and `MnRouterProbeTimeout`, not a discrete mode enum. Removed the fictitious directive and replaced it with `MnRouterProbes 3;` (a real directive) alongside the existing `MnRouterProbeTimeout`.

3. **RFC 6275 does not define "eager cell-switching" and "lazy movement detection"** — Those terms appear nowhere in RFC 6275. Section 11.5.1 specifies a single "generic movement detection" scheme based on Router Discovery and NUD, and explicitly does not standardize a fast detection algorithm. The eager/lazy taxonomy comes from academic literature and FMIPv6 (RFC 5568) discussions. Reworded the introduction to accurately describe what RFC 6275 specifies.

## Review Notes
- `ping6` is deprecated on modern Linux distributions; on most current systems `/usr/bin/ping6` is symlinked to `ping`, and `ping -6` (or just `ping` against an IPv6 address) is preferred. The existing `ping6` invocation still works on virtually all systems, so it was left in place, but readers on the latest distros may prefer `ping -6`.
- The tcpdump filter `icmp6 and ip6[40] == 134` works correctly for the common case where the IPv6 packet has no extension headers (RAs almost never carry any). If a Hop-by-Hop, Routing, or Destination Options header is present, `ip6[40]` would no longer be the ICMPv6 type byte and the filter would miss. For typical RA capture this is fine; readers handling exotic packets may prefer `icmp6[icmp6type] == icmp6-router-advertisement` or filter at higher layers.
- `ucast_solicit` defaults to 3, so the example `=3` is illustrative rather than a change from the default — fine as a teaching example.
- The `score >= 3` threshold in `is_genuine_movement` allows any single "strong" indicator (RA prefix change at score 3, or link-layer at score 4) to trigger handover, while a moderate signal alone (router unreachable at score 2) does not. The threshold matches the comment.
- The Python snippet is clearly labelled pseudo-code; it does not depend on a specific library, so no import correctness issues.
