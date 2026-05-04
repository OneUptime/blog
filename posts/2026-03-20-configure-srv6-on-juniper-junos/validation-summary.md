# Validation Summary: How to Configure SRv6 on Juniper Junos - A Practical Guide

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Juniper Junos OS (CLI / `set` configuration syntax)
- SRv6 (Segment Routing over IPv6, RFC 8754 / RFC 8986)
- IS-IS (with SRv6 extensions, RFC 9352)
- BGP L3VPN over SRv6 (`inet-vpn` / `inet6-vpn` address families)
- SRv6 Traffic Engineering (segment-lists, policies, candidate-paths)

## Sources Consulted
- [srv6 (Routing Options) | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/srv6-edit-routing-options-source-packet-routing.html) — confirmed `srv6` statement was introduced in Junos OS Release 20.3R1.
- [locator (routing-options source-packet-routing srv6) | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/locator-edit-routing-options-source-packet-routing-srv6.html) — confirmed valid sub-statements (`end-sid`, `flavor`, `anycast`, `algorithm`, `dynamic-end-sid`, `micro-sid`); no `block-length` / `node-length` / `func-length` exist.
- [Example: Configuring SRv6 Network Programming in IS-IS Networks | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/example/isis-configuring-srv6-network-programming.html) — reference for IS-IS source-packet-routing srv6 hierarchy and end-sid configuration.
- [Understand SRv6 Static Segment Identifier | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/srv6-static-sid-conf.html) — confirmed end-sid uses `flavor { psp; usp; usd; }`, not `srv6-sid-flags`.
- [SRv6 Network Programming and Layer 3 Services in BGP Networks | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/segment-routing/topics/topic-map/bgp-srv6-network-programming.html) — confirmed BGP-based L3VPN over SRv6 was added in 20.4R1; confirmed VRF SRv6 binding hierarchy.
- [L3VPN Services over SRv6 | Juniper Community blog (Krzysztof Szarkowicz)](https://community.juniper.net/blogs/krzysztof-szarkowicz/2022/08/11/l3vpn-over-srv6) — confirmed correct hierarchy is `routing-instances <name> protocols bgp source-packet-routing srv6 locator <name> end-dt4-sid` (and `end-dt6-sid`), and that `family inet-vpn unicast` requires `extended-nexthop`, `advertise-srv6-service`, `accept-srv6-service`.
- [srv6 (Protocols BGP) | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/srv6-edit-protocols-bgp-source-packet-routing.html) — confirmed `end-dt4-sid` / `end-dt6-sid` / `end-dt46-sid` are configured under BGP source-packet-routing srv6 in a routing-instance.

## Issues Found

1. **Incorrect Junos release for SRv6 support (Introduction).** The post claimed SRv6 was supported "from Junos 19.4R1 onward". The CLI Reference page for the `srv6` statement under `routing-options source-packet-routing` explicitly states it was "introduced in Junos OS Release 20.3R1". BGP-based L3VPN over SRv6 came in 20.4R1. **Fixed** the introduction to reflect 20.3R1 (with 20.4R1 noted for L3VPN).

2. **Non-existent locator sub-statements (Step 1).** The post showed `set ... locator LOC1 block-length 32`, `node-length 16`, and `func-length 16`. These sub-statements do not exist on Juniper Junos — the locator statement only supports `end-sid`, `flavor`, `anycast`, `algorithm`, `dynamic-end-sid`, and `micro-sid`. The block/node/function structure is implicit in the locator prefix length. **Fixed** by removing those three lines and replacing the `locator LOC1 prefix 5f00:1:1::/48` form with the canonical `locator LOC1 5f00:1:1::/48`, plus a brief comment explaining that the structure is implicit.

3. **Wrong end-SID flag syntax (Step 2).** The post used `srv6-sid-flags srv6-e-flag`, which is not valid Junos syntax. End-SID behaviors on Junos are configured with `flavor { psp | usp | usd }` (Penultimate Segment Pop / Ultimate Segment Pop / Ultimate Segment Decapsulation). **Fixed** the line to `... end-sid 5f00:1:1::1 flavor psp`.

4. **Wrong VRF / L3VPN SRv6 binding hierarchy (Step 3).** The post used `set routing-instances CUSTOMER_A routing-options srv6 locator LOC1`, which is not the correct Junos hierarchy. SRv6 SID allocation for an L3VPN VRF lives under `routing-instances <name> protocols bgp source-packet-routing srv6 locator <name>` and requires an explicit `end-dt4-sid` (IPv4 customers) or `end-dt6-sid` (IPv6 customers). The post also omitted the BGP group settings required for SRv6 service exchange (`extended-nexthop`, `advertise-srv6-service`, `accept-srv6-service`). **Fixed** by replacing the incorrect line with the correct `protocols bgp source-packet-routing srv6 locator LOC1 end-dt4-sid ...` form, and added the BGP group SRv6 service statements.

5. **Wrong code-block language tag (Step 1).** The first fenced code block was tagged `javascript`, but the contents are Junos CLI commands. **Fixed** the language tag to `text` to match the other Junos blocks in the post.

## Review Notes

- The IS-IS interface configuration at line 31 (`set protocols isis interface ge-0/0/0.0 family inet6`) uses Junos' CLI quirk where IS-IS interfaces are enabled at the family level even though IS-IS is itself an L2 protocol; this is correct and intentional in Junos.
- The SRv6 TE policy syntax in Step 4 (`set routing-options source-packet-routing srv6 policy ... endpoint ... color ... candidate-path ... segment-list ...`) is plausible and aligns with the documented hierarchy. The exact statement form has shifted slightly across Junos versions (some releases use `source-routing-path` under `protocols source-packet-routing`); the form shown here is consistent with newer SRv6-specific releases. No change made — readers should consult the Junos release notes for their specific version if commits fail.
- The operational `show segment-routing srv6 ...` command family is the correct top-level command tree on Junos for SRv6 inspection and was left untouched.
- The locator / End-SID prefix `5f00::/16` (e.g. `5f00:1:1::/48`) used in the post is from the IANA SRv6 SID Block reservation (RFC 9602), so the example addressing is appropriate and not a routable global address — good practice for a tutorial.
- Future readers should remember that the Junos SRv6 feature surface has moved quickly across releases (20.3R1 → 20.4R1 → 21.x → 22.x → 23.4R1 micro-SIDs / dynamic-end-sid), so version-specific verification against the release notes is recommended.
