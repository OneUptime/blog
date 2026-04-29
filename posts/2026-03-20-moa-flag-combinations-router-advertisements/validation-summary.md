# Validation Summary: How to Understand M/O/A Flag Combinations in Router Advertisements

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- IPv6 Router Advertisements (RFC 4861)
- IPv6 Stateless Address Autoconfiguration / SLAAC (RFC 4862)
- DHCPv6 (stateful and stateless)
- RDNSS option in RAs (RFC 8106)
- radvd (router advertisement daemon) configuration
- ndisc6 / rdisc6 utility

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §4.2 Router Advertisement Message Format (M and O flag definitions)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration, §5.5 Creation of Global Addresses (A flag / Prefix Information Option semantics)
- RFC 8106 — IPv6 Router Advertisement Options for DNS Configuration (RDNSS)
- radvd.conf(5) man page — directive names (`AdvSendAdvert`, `AdvManagedFlag`, `AdvOtherConfigFlag`, `AdvAutonomous`, `RDNSS`, `AdvRDNSSLifetime`, `AdvOnLink`)
- ndisc6 / rdisc6(8) man page — output format for received RA flags

## Issues Found

1. **M=0 description conflated with SLAAC behavior.** Original text claimed "M=0: Clients use SLAAC to configure addresses autonomously from the advertised prefix." Per RFC 4861/4862, the M flag only controls whether DHCPv6 is used for addresses; whether SLAAC actually runs depends on the per-prefix A flag. With M=0 and A=0, no address is autoconfigured. Rewrote the bullet to make the dependence on the A flag explicit.

2. **M=1 "MUST" wording too strong.** Original: "M=1: Clients MUST use DHCPv6 to obtain addresses." RFC 4861 §4.2 states M=1 "indicates that addresses are available via DHCPv6" — this is a hint, not a normative MUST. Softened to "should use DHCPv6" and clarified that SLAAC may still occur when A is set.

3. **O=0 description was over-broad.** Original: "O=0: Clients do not use DHCPv6 for anything." Incorrect — the O flag only governs non-address configuration. With M=1 and O=0, hosts still use DHCPv6 for addresses. Clarified that O controls non-address configuration only and noted the M flag's separate role.

4. **`rdisc6` grep pattern included a token that never matches.** Original: `grep -E "Stateful|Stateless|conf"`. rdisc6 prints lines like `Stateful address conf.` and `Stateful other conf.`; it never emits the word "Stateless." Replaced with `grep -E "Stateful|conf\."` to match real output without a dead alternation.

## Review Notes

- The radvd configuration snippets are syntactically valid — directive names and structure all match `radvd.conf(5)`.
- The Mermaid flowchart uses `\n` inside quoted node labels for line breaks, which works in current Mermaid versions used by most renderers; left unchanged.
- The Flag Interaction Matrix is internally consistent with the corrected M/O semantics.
- The post intentionally omits some less common combinations (e.g., M=1/O=0/A=1, M=0/O=1/A=0); this is reasonable for a "meaningful combinations" guide.
- "If M is set, O is redundant" (RFC 4861 §4.2 note) is not mentioned, but the post's matrix is still consistent with this — a nice future addition rather than an error.
