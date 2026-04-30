# Validation Summary: How to Understand ICMPv6 Redirect Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6 Neighbor Discovery Protocol (NDP)
- RFC 4861 Redirect messages
- Linux IPv6 networking sysctls
- `iproute2`
- `ip6tables`

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- Linux kernel networking sysctl documentation (`accept_redirects`, IPv6 forwarding behavior): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-route(8)` manual page (`cache`, `cached`, and cloned-route behavior): https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local command help on the review host: `ip -6 route help`
- Local command help on the review host: `ip6tables -p icmpv6 -h`

## Issues Found
- The post said a router "MUST" send a Redirect when the listed conditions are met. RFC 4861 Section 8.2 says a router `SHOULD` send a Redirect, subject to rate limiting. I updated the wording and aligned the conditions with the RFC's actual router requirements.
- The redirect example implied the host would be told to use Router-B for the whole `2001:db8:2::/64` prefix. RFC 4861 Redirect messages carry a single Destination Address, and the host updates its Destination Cache for that destination. I corrected the example to `2001:db8:2::1`.
- The Linux cache example overclaimed that cached redirect entries would show up with a literal `redirect` marker and that redirect state is always stored separately from the route table. The RFC only defines a conceptual Destination Cache, and Linux documents cached/cloned routes rather than a guaranteed standalone redirect view. I narrowed the wording to say redirect-learned entries may appear as cached routes.
- The security guidance said redirects should be accepted only from the current default gateway and that Linux checks the default router list. RFC 4861 Section 8.1 is stricter: the Redirect source must match the current first-hop router for the specific destination. I corrected that wording and scoped the `ip6tables` example to a single-router host.
- The switch-security note implied generic ND inspection validates Redirect sources against prior Router Advertisements. That is not a universal standards-based guarantee across switch platforms. I revised it to note that Redirect validation support is vendor-specific.

## Review Notes
- `ip -6 route show cache` is valid, but it can legitimately return no output when there are no relevant cached/cloned IPv6 routes to display.
- The packet-filter example was syntax-checked with `ip6tables v1.8.10 (nf_tables)`. Systems using native `nft` rulesets may express the same policy differently.
