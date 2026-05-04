# Validation Summary: How to Configure SRv6 on Juniper Junos

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Juniper Junos OS (`set` / hierarchical CLI)
- SRv6 (Segment Routing over IPv6, RFC 8754 / RFC 8986)
- SRv6 micro-SID / uSID (RFC draft / Juniper implementation)
- IS-IS with SRv6 extensions (RFC 9352)
- SRv6 Traffic Engineering policies (segment-lists, candidate-paths)
- BGP L3VPN over SRv6 (`inet-vpn unicast` with End.DT4)
- IANA SRv6 SID Block `5f00::/16` (RFC 9602)

## Sources Consulted
- [srv6 (Routing Options) | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/srv6-edit-routing-options-source-packet-routing.html) — confirmed SRv6 lives under `routing-options source-packet-routing srv6` (introduced in Junos OS 20.3R1).
- [locator (routing-options source-packet-routing srv6) | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/locator-edit-routing-options-source-packet-routing-srv6.html) — confirmed locator syntax `locator <name> <prefix>` (no `prefix` keyword) and supported sub-statements `end-sid`, `flavor`, `anycast`, `algorithm`, `dynamic-end-sid`, `micro-sid`.
- [Example: Configuring SRv6 Network Programming in IS-IS Networks | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/example/isis-configuring-srv6-network-programming.html) — confirmed `protocols isis source-packet-routing srv6 locator <name> end-sid <addr> flavor psp` is the canonical IS-IS SRv6 binding (not `node-segment ipv6-index`, which is SR-MPLS terminology).
- [Understand SRv6 Static Segment Identifier | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/srv6-static-sid-conf.html) — confirmed End-SID flavors are `psp`, `usp`, `usd`.
- [SRv6 Network Programming and Layer 3 Services in BGP Networks | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/segment-routing/topics/topic-map/bgp-srv6-network-programming.html) — confirmed BGP L3VPN over SRv6 (20.4R1+) requires `family inet-vpn unicast` with `extended-nexthop`, `advertise-srv6-service`, `accept-srv6-service`, plus per-VRF binding under `routing-instances <name> protocols bgp source-packet-routing srv6 locator <name> end-dt4-sid <sid>`.
- [srv6 (Protocols BGP) | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/srv6-edit-protocols-bgp-source-packet-routing.html) — confirmed `end-dt4-sid` / `end-dt6-sid` / `end-dt46-sid` are configured under `protocols bgp source-packet-routing srv6` inside the routing-instance.
- [L3VPN Services over SRv6 | Juniper Community blog (Krzysztof Szarkowicz)](https://community.juniper.net/blogs/krzysztof-szarkowicz/2022/08/11/l3vpn-over-srv6) — confirmed end-to-end L3VPN over SRv6 hierarchy and operational `show segment-routing srv6 ...` command tree.
- Cross-checked with the already-validated sister post `posts/2026-03-20-configure-srv6-on-juniper-junos/` (validated 2026-05-04 by the same author), which used the same Juniper documentation pages and arrived at the same canonical syntax.

## Issues Found

1. **Wrong top-level hierarchy for SRv6 (Locator section).** The post placed SRv6 under `protocols source-packet-routing srv6`. The Junos CLI Reference for the `srv6` statement explicitly puts it under `routing-options source-packet-routing srv6`. **Fixed** by rewriting both the `set`-style and curly-brace forms to use `routing-options source-packet-routing`.

2. **Non-existent command `set routing-options source-routing` (Locator section).** There is no `source-routing` knob under `routing-options`; SRv6 is enabled by simply configuring a locator under `routing-options source-packet-routing srv6`. **Removed** the bogus line.

3. **Wrong locator syntax `locator MAIN prefix 5f00:2::/48` (Locator section).** Per the CLI Reference, the locator is configured as `locator <name> <prefix>` directly, with no `prefix` keyword. **Fixed** to `locator MAIN 5f00:2::/48`.

4. **Redundant standalone `set protocols source-packet-routing srv6` and `no-reduced-srh` lines (Locator section).** The first is a no-op stub (already implied by configuring a locator), and `no-reduced-srh` is not a standalone locator-block statement; it has been replaced with the more useful `source-address` statement, which the sister post and Juniper docs both show as the canonical SRH source-address knob.

5. **Loopback assigned the locator's network address (`5f00:2::/128`).** Assigning the all-zero address of the locator block to lo0 is a config error — that address is the network identifier of the locator and is reserved by SRv6 forwarding. **Fixed** to `5f00:2::1/128`.

6. **`node-segment ipv6-index 2` is SR-MPLS syntax, not SRv6 (IS-IS section).** The `node-segment ipv6-index` statement applies to the SR-MPLS world (`source-packet-routing srv-mpls`), not SRv6. The Junos IS-IS / SRv6 example explicitly binds an End-SID using `locator <name> end-sid <addr> flavor psp`. **Fixed** the IS-IS source-packet-routing block accordingly.

7. **Operational command `show protocols source-packet-routing srv6 sid` does not exist (Verification section).** Junos operational `show` commands for SRv6 live under the `show segment-routing srv6 ...` tree (e.g. `show segment-routing srv6 locator detail`, `show segment-routing srv6 sid detail`), as documented in Juniper's SRv6 operational guides and used in the sister post. **Fixed** the show commands to the correct family.

8. **`show spring-traffic-engineering lsp detail` is the wrong command for SRv6 (Verification section).** `spring-traffic-engineering` shows SR-MPLS LSPs, not SRv6 policies. SRv6 policies are inspected via `show segment-routing srv6 locator detail` (and `show segment-routing traffic-engineering policy detail` for TE policies). **Fixed**.

9. **`ping 5f00:3:: routing-instance default ...` syntax problem (Verification section).** Junos uses `ping inet6 <addr>` for explicit IPv6 ping, and pinging the all-zero address of a locator (`5f00:3::`) targets the network identifier rather than a real End-SID. **Fixed** to `ping inet6 5f00:3::1 source 5f00:2::1`.

10. **SRv6 TE policy modeled as a `spring-traffic-engineering` LSP with `label-switched-path` and `path-segments` (TE section).** That entire block is SR-MPLS terminology adapted incorrectly — SRv6 has no labels, no `label-switched-path`, and the `path-segments`/`segment <ipv6-addr>` shape is not a real Junos statement. SRv6 policies in Junos use `routing-options source-packet-routing srv6 segment-list <name> { segment index N srv6-sid <sid>; }` together with `policy <name> { endpoint ...; color ...; candidate-path preference N { segment-list <name>; } }`. **Rewrote** the entire example using the canonical SRv6 segment-list / policy hierarchy.

11. **L3VPN-over-SRv6 hierarchy `family inet6 unicast srv6 locator MAIN` is invalid (BGP section).** Junos has no `family inet6 unicast srv6 locator` knob. The correct hierarchy is per-VRF: `routing-instances <name> protocols bgp source-packet-routing srv6 locator <name> end-dt4-sid <sid>` (and/or `end-dt6-sid`/`end-dt46-sid`), and the iBGP group itself must enable `family inet-vpn unicast` with `extended-nexthop`, `advertise-srv6-service`, and `accept-srv6-service`. **Rewrote** the BGP block to show both the iBGP group settings and the per-VRF SID binding using End.DT4.

12. **Conclusion misnamed the relevant hierarchies.** The original conclusion said configuration uses `source-packet-routing` and `spring-traffic-engineering` hierarchies, but `spring-traffic-engineering` is SR-MPLS-only. **Updated** the conclusion to point at `routing-options source-packet-routing srv6` and the per-VRF `protocols bgp source-packet-routing srv6` hierarchy, with `show segment-routing srv6 locator` and `show segment-routing traffic-engineering policy detail` as the verification commands.

## Review Notes

- Junos's `show isis database extensive` is correct for inspecting SRv6 sub-TLVs in the IS-IS LSDB; the grep is illustrative, not strictly required.
- The IANA SRv6 SID Block `5f00::/16` (RFC 9602) is used throughout, which is the right address family for examples in a public tutorial — these prefixes are reserved for SRv6 and not globally routable.
- Junos SRv6 syntax has evolved across releases (20.3R1 → 20.4R1 → 21.x → 22.x → 23.4R1). The corrected post tracks the current canonical hierarchy as documented in the Junos CLI Reference and the BGP-SRv6 topic map; readers on older releases (especially pre-21) should consult their release notes for any sub-statement deltas.
- The interface section, IS-IS metric/level config, and VRF (`route-distinguisher`/`vrf-target`) syntax are standard Junos and were correct as written — left untouched.
- The `micro-sid` knob under the locator is the correct Junos statement for enabling SRv6 uSID compression on supported platforms; verified against the locator CLI Reference.
