# Validation Summary: How to Tune NDP Timers for IPv6

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP / RFC 4861)
- Linux kernel neighbour subsystem (`net.ipv6.neigh.*` sysctls)
- `iproute2` (`ip -6 neigh`, `ip monitor neigh`)
- `sysctl` / `/etc/sysctl.d/`
- `radvd` (Router Advertisement daemon)
- `tcpdump` (ICMPv6 capture filters)

## Sources Consulted
- [arp(7) Linux manual page](https://man7.org/linux/man-pages/man7/arp.7.html) — sysctl defaults for the shared neighbour subsystem (`base_reachable_time_ms`, `retrans_time_ms`, `delay_first_probe_time`, `ucast_solicit`, `mcast_solicit`, `gc_interval`, `gc_stale_time`, `gc_thresh{1,2,3}`)
- [Linux kernel ip-sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- [RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)](https://www.rfc-editor.org/rfc/rfc4861) — §6.3.2 host behavior, §10 protocol constants (`MIN_RANDOM_FACTOR`=0.5, `MAX_RANDOM_FACTOR`=1.5, `REACHABLE_TIME`=30000ms, `RETRANS_TIMER`=1000ms)
- [ip-neighbour(8) manual page](https://man7.org/linux/man-pages/man8/ip-neighbour.8.html) — `ip neigh show`, `flush nud STATE dev DEV` syntax, output format
- [radvd.conf(5) manual page](https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html) — `AdvReachableTime`, `AdvRetransTimer`, `AdvSendAdvert`
- RFC 4443 — ICMPv6 type numbers (135 = Neighbor Solicitation)

## Issues Found

1. **`awk '{print $5}'` extracted the wrong column for NUD state.** The post used `awk '{print $5}'` twice (in the cache statistics command and in the `watch` monitor command) to print neighbor states. In `ip -6 neigh show` output the state is the **last** field, not field 5 — its position varies because the optional `lladdr <mac>` and `router` flag shift columns. For `fe80::1 dev eth0 lladdr 00:11:22:33:44:55 router REACHABLE`, the state is at `$7`; for entries without `router` it is at `$6`; for `FAILED`/`INCOMPLETE` entries with no lladdr, even earlier. Field 5 is most often the MAC address. Replaced both occurrences with `awk '{print $NF}'`.

2. **Incorrect "1/10th of actual" comment on `AdvReachableTime`.** The radvd snippet annotated `AdvReachableTime 15000` with `# Announce preferred reachability time (1/10th of actual)`. There is no 1/10th relationship anywhere in RFC 4861 or radvd — `AdvReachableTime` is announced verbatim in milliseconds and used by hosts as `BaseReachableTime`. Per RFC 4861 §6.3.2 / §10 each host computes its own per-neighbor `ReachableTime` by drawing uniformly between `MIN_RANDOM_FACTOR` (0.5) and `MAX_RANDOM_FACTOR` (1.5) times the announced value. Replaced the comment with `# Announced reachable time in ms; hosts randomize 0.5x-1.5x per RFC 4861`.

## Review Notes
- All sysctl default values in the reference table are correct against `arp(7)` and RFC 4861.
- The tcpdump filter `icmp6 and ip6[40]==135` correctly captures Neighbor Solicitations (assumes no IPv6 extension headers between the IPv6 fixed header and ICMPv6 header — the normal case for on-link NDP traffic).
- `ip -6 neigh flush nud failed dev eth0` is valid syntax per `ip-neighbour(8)`.
- The Linux neighbour subsystem sysctls are shared between IPv4 (ARP) and IPv6 (NDP); `arp(7)` is the canonical man page even though the post is IPv6-specific.
- The `gc_thresh2` description ("GC starts here") is a reasonable simplification — strictly, the kernel allows the cache to exceed `gc_thresh2` for up to 5 seconds before forcing GC. Not technically wrong, just abbreviated.
