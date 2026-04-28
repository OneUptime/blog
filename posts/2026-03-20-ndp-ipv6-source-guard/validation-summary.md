# Validation Summary: How to Configure IPv6 Source Guard

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 Source Guard (Cisco IOS First Hop Security)
- IPv6 Snooping / ND Inspection
- DHCPv6 (IA_NA, DUID, IAID)
- SLAAC and Duplicate Address Detection (DAD)
- Cisco IOS configuration syntax (`ipv6 snooping policy`, `ipv6 source-guard policy`)
- Linux ip6tables `rpfilter` match
- Linux sysctl namespace for IPv6

## Sources Consulted
- Cisco IOS IPv6 First-Hop Security Configuration Guide and IPv6 command reference (`ipv6 source-guard policy`, `ipv6 snooping policy`, `show ipv6 source-guard policy`, `show ipv6 snooping policies`, `show ipv6 neighbor binding`)
- Linux kernel networking documentation: `Documentation/networking/ip-sysctl.rst` (IPv4 vs IPv6 sysctl variables)
- `iptables-extensions(8)` man page (rpfilter match)
- Netfilter project wiki on the rpfilter match
- RFC 5095 (Deprecation of Type 0 Routing Headers in IPv6)
- RFC 4861 (Neighbor Discovery for IPv6) — NS/NA/DAD semantics
- RFC 8415 (DHCPv6) — IA_NA, DUID, IAID
- RFC 7039 (Source Address Validation Improvement framework)

## Issues Found

1. **Incorrect Linux IPv6 RPF sysctls.** The original "Linux (host-level)" section instructed readers to enable IPv6 RPF with:
   - `echo 2 | sudo tee /proc/sys/net/ipv6/conf/eth1/accept_source_route`
   - `sudo sysctl -w net.ipv6.conf.eth1.rp_filter=1`

   Both are technically wrong:
   - `accept_source_route` under `/proc/sys/net/ipv6/conf/*` controls acceptance of IPv6 routing headers (Type 0, deprecated by RFC 5095). It is unrelated to reverse-path filtering, and the value `2` is not a defined strict-RPF mode for this knob.
   - There is **no `rp_filter` sysctl in the IPv6 namespace** in the mainline Linux kernel. `rp_filter` only exists under `/proc/sys/net/ipv4/conf/*`. Setting `net.ipv6.conf.eth1.rp_filter=1` returns "unknown key".

   **Fix:** Replaced both lines with a note explaining that IPv6 has no rp_filter sysctl and that `accept_source_route` is for routing headers, not RPF. Kept the ip6tables-based enforcement as the correct approach.

2. **ip6tables rpfilter match used in the wrong chain.** The original example used `ip6tables -A FORWARD -m rpfilter --invert -j DROP`. Per `iptables-extensions(8)`, the rpfilter match is documented as valid in the `raw` or `mangle` table, **PREROUTING** chain. Using `FORWARD` is not a documented invocation and will not behave as intended on standard kernels (xt_rpfilter is registered against the PREROUTING hook).

   **Fix:** Changed the rule to `sudo ip6tables -t mangle -A PREROUTING -m rpfilter --invert -j DROP` and updated the explanatory comment.

3. **Fabricated Cisco IOS show commands.** The "Verifying" section listed:
   - `show ipv6 source-guard interface GigabitEthernet1/0/1`
   - `show ipv6 source-guard statistics`

   Neither command appears in Cisco's IOS IPv6 First-Hop Security command reference. Interface-level visibility is normally retrieved via `show ipv6 snooping policies interface ...` and the binding state via `show ipv6 neighbor binding`. Only `show ipv6 source-guard policy` is documented.

   **Fix:** Replaced the bogus interface command with `show ipv6 snooping policies interface GigabitEthernet1/0/1` and removed the non-existent `show ipv6 source-guard statistics` line (and its preceding comment).

## Review Notes
- The example binding-table line `fe80::211:22ff` is a truncated EUI-64 link-local; the full form would be `fe80::211:22ff:fe33:4455`. Left as-is since it is plainly an illustrative trimmed display, not a configuration command, and editing it is stylistic rather than a correctness fix.
- The Cisco snooping/source-guard syntax shown corresponds to the older `ipv6 snooping policy` / `ipv6 source-guard policy` model. On newer IOS-XE platforms this has been unified under the device-tracking framework (`device-tracking policy`); the original syntax still works on many platforms but readers on recent IOS-XE images may want to consult the device-tracking command reference instead. No fix applied because both syntaxes coexist and the post does not claim to target a specific release.
- The `deny global-autoconf` semantic in `ipv6 source-guard policy` denies traffic sourced from globally autoconfigured (SLAAC/EUI-64) addresses that lack a binding-table entry; the post's explanation is consistent with Cisco documentation.
- The Juniper command `show nd-security binding` is mentioned only as a pointer; Junos NDI/SAVI command names vary by platform and release. Left unchanged as it is not the focus of the post.
