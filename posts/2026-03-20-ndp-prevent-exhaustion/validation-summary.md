# Validation Summary: How to Prevent NDP Exhaustion Attacks

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861, RFC 6583
- Linux IPv6 neighbor cache (`net.ipv6.neigh.*` sysctls)
- `ip -6 neigh` / `/proc/net/stat/ndisc_cache`
- iptables `ip6tables` with the `hashlimit` and `iprange` modules
- Cisco IOS / IOS XE IPv6 First-Hop Security (`ipv6 snooping policy`)
- Cisco IOS Enhanced IPv6 ND cache management (`ipv6 nd cache interface-limit`, `ipv6 nd nud retry`, `ipv6 nd resolution data limit`)

## Sources Consulted
- RFC 6583 "Operational Neighbor Discovery Problems": https://datatracker.ietf.org/doc/html/rfc6583
- RFC 4861 "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861
- Linux kernel `Documentation/networking/ip-sysctl.rst` and `include/net/neighbour.h` (defaults for `gc_thresh*`, `base_reachable_time_ms`, `retrans_time_ms`, `gc_interval`, `gc_stale_time`, `mcast_solicit`)
- iptables-extensions(8) man page (hashlimit `--hashlimit-srcmask` vs `--hashlimit-dstmask`, `iprange` module)
- Cisco IOS IPv6 Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco "Enhanced IPv6 Neighbor Discovery Cache Management" guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_basic/configuration/15-e/ip6b-15-e-book/ip6-nd-cache-mgmt.html
- Cisco "IPv6 Snooping" / IPv6 First-Hop Security guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-s/ip6f-15-s-book/ip6-snooping.html

## Issues Found
1. **Wrong hashlimit mask option for `dstip` mode.** Two `ip6tables` rules used `--hashlimit-srcmask 64` while `--hashlimit-mode dstip`. Per iptables-extensions(8), `--hashlimit-srcmask` only applies when the mode includes `srcip`; for destination-grouped hashing the option is `--hashlimit-dstmask`. As written the mask was silently ignored, defeating the "limit any single /64 to 50/sec" intent. Changed both occurrences to `--hashlimit-dstmask 64`.

2. **Misleading "per source" comment.** The first hashlimit rule was commented "100/sec per source" but used `--hashlimit-mode dstip` (per-destination). Updated the comment to "per destination" so it matches the rule's actual behavior.

3. **`base_reachable_time_ms=30000` does not "reduce" anything.** 30000 ms is the kernel default (`NEIGH_VAR_BASE_REACHABLE_TIME = 30*HZ` in `include/net/neighbour.h`), so the example as written was a no-op despite the "Reduce…" comment. Lowered the example value to 15000 ms and clarified the mechanism (entries transition to STALE sooner, then `gc_stale_time` reaps them).

4. **`ipv6 nd nud retry` parameter description was wrong.** The annotation read "2 retries, 1000ms interval, 3 max", but per Cisco's IPv6 command reference the first parameter is the **exponential backoff base**, not a retry count, and the third parameter is the maximum number of attempts. Updated the inline comment to "backoff base 2, 1000ms interval, 3 max attempts".

## Review Notes
- `gc_interval` is documented as "Unused since kernel v2.6.8" in the modern `ip-sysctl.rst`. Tuning it is harmless but no longer has an effect on most current kernels — left in place because the post is illustrating the parameter set, but worth flagging in a future revision.
- The post's `ipv6 snooping policy` syntax is valid and still accepted on classic IOS / many IOS XE images, but on Catalyst 9000 / IOS XE 16.9+ Cisco recommends the unified `device-tracking policy` (same sub-commands: `security-level`, `limit address-count`, `tracking`). A future update could note both forms.
- The /120 example (`! -d 2001:db8::1/120`) correctly covers `2001:db8::00`–`2001:db8::ff`; the IP-with-mask form is technically allowed by `ip6tables` (it normalises to the prefix). Functionally fine, just stylistically unusual.
- The attack walk-through (INCOMPLETE entry creation, NS to the solicited-node multicast, 3 retransmits, then FAILED) matches RFC 4861 §7.2.2 and `MAX_MULTICAST_SOLICIT = 3` / `RETRANS_TIMER = 1000 ms`, and Linux `mcast_solicit = 3`. No correction needed.
