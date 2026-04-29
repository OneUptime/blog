# Validation Summary: How to Configure IPv6 Peering at Internet Exchange Points

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BGP
- FRRouting (FRR)
- Internet Exchange Points (IXPs)
- Linux `ip` networking tools
- `traceroute`

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- FRRouting filtering documentation: https://docs.frrouting.org/en/latest/filter.html
- RFC 7947, Internet Exchange BGP Route Server: https://www.rfc-editor.org/rfc/rfc7947.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- `traceroute(8)` Linux manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:ixp::42` and `2001:db8:mynet::/32`. These were replaced with valid documentation-prefix examples under `2001:db8::/32` per RFC 3849.
- The FRR filtering example used `ip prefix-list` for IPv6 policy while the FRR documentation and examples use `ipv6 prefix-list` for IPv6 prefix lists. The filter examples were updated accordingly.
- The import policy example permitted `::/0 le 48`, which is broader than needed for IXP IPv6 acceptance policy. It was tightened to `2000::/3 le 48` so the example accepts global-unicast IPv6 routes up to `/48` while still denying default, ULA, link-local, and IPv4-mapped ranges.
- The route-server section referenced `IXP_RS_IMPORT` and `IXP_RS_EXPORT`, but those route maps were never defined, and it also applied `neighbor ... route-map IXP_ACCEPT_IPV6 in`, which is invalid because `IXP_ACCEPT_IPV6` is a prefix list, not a route map. The example was corrected to reuse the defined `IXP_IMPORT` and `IXP_EXPORT` route maps and to add `soft-reconfiguration inbound` instead.
- The route-server explanation said peering with a route server gives automatic peering with all RS members and implied multipath would work just because the route server does not change AS_PATH. That was corrected to the technically accurate statement that route-server peering provides multilateral peering with participating members subject to policy, and the AS_PATH comment was softened to match RFC 7947.
- The verification section used `grep "IXP"` on `show bgp ipv6 unicast summary`, which is not a reliable way to identify sessions, counted `received-routes` output with `wc -l`, and ran `traceroute6` against a prefix instead of a host. Those examples were corrected to use the summary command directly, inspect received routes directly, and trace to an IPv6 host with `traceroute -6`.
- The overview and conclusion made a few absolute operational claims about cost and latency. Those were softened to accurate conditional statements without changing the overall meaning.

## Review Notes
- FRR examples in the official documentation show IPv6 neighbors being activated under `address-family ipv6 unicast`, which matches the corrected post.
- FRR supports `show bgp ... received-routes`, but it is most useful when `soft-reconfiguration inbound` is enabled for the neighbor, which the corrected examples now include where that command is used.
- The example `network 2001:db8:1000::/48` is syntactically correct for FRR. In practice, the advertised prefix must also exist in the local routing context used by BGP before it will be originated, depending on deployment and `bgp network import-check` behavior.
