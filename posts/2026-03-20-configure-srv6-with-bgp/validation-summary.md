# Validation Summary: How to Configure SRv6 with BGP - With

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- BGP (Border Gateway Protocol)
- BGP L3VPN (VPNv6 over SRv6)
- BGP EVPN with SRv6
- BGP SR Policy (RFC 9256)
- FRRouting (FRR)
- Cisco IOS-XR
- RFC 9252 (BGP Overlay Services Based on SRv6)

## Sources Consulted
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 9252 — BGP Overlay Services Based on Segment Routing over IPv6 (SRv6): https://datatracker.ietf.org/doc/rfc9252/
- RFC 9256 — Segment Routing Policy Architecture: https://datatracker.ietf.org/doc/rfc9256/
- FRR 8.0 release notes: https://frrouting.org/release/8.0/
- FRR PR #9649 (initial SRv6 IPv4 L3VPN support): https://github.com/FRRouting/frr/pull/9649
- Segment-routing.net IOS-XR SRv6 reference: https://www.segment-routing.net/tutorials/srv6-731-features/
- Cisco IOS-XR Segment Routing config guide: https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/segment-routing/72x/b-segment-routing-cg-ncs5500-72x/configure-segment-routing-over-ipv6.html

## Issues Found
1. **Title was truncated** — original title read "How to Configure SRv6 with BGP - With" with a dangling "- With". Removed the trailing fragment so the title reads "How to Configure SRv6 with BGP".
2. **FRR version claim was inaccurate** — post stated "FRR supports SRv6 BGP from version 8.0+". SRv6 BGP L3VPN actually merged in FRR 8.2 (PR #9649) and matured through 8.5+. Updated wording to reflect this.
3. **FRR VRF BGP syntax was wrong** — post nested `vrf CUSTOMER_A` inside the main `router bgp 65000` block. FRR uses a separate top-level instance: `router bgp 65000 vrf CUSTOMER_A`. Restructured Step 1 and Step 4 accordingly.
4. **`sid vpn export` syntax was incorrect** — post used `sid vpn export 5f00:1:1:0:e000:: locator MAIN`, which is not valid FRR syntax. The command takes an index, `auto`, or `explicit X:X::X:X` and does not accept a `locator` keyword on the same line. Replaced with `sid vpn export auto` and added the missing `rd vpn export` and `rt vpn both` lines required for the VRF.
5. **Missing BGP-level locator binding** — the original Step 1 omitted the `segment-routing srv6 / locator MAIN` block under `router bgp`, which is how the locator is actually bound to the BGP instance in FRR. Added this block.
6. **Step 3 referenced a non-existent FRR address-family** — post showed `address-family ipv6 sr-te-policy` in FRR. FRR's bgpd does not expose a configurable SR Policy address-family; SR Policy in FRR is handled by `pathd`, and BGP SR Policy SAFI distribution is a feature of platforms such as Cisco IOS-XR and Junos. Reworded the step and replaced the example with an IOS-XR head-end configuration that actually exists.
7. **Step 5 EVPN VNI placement was wrong** — `vni 100` block was outside `address-family l2vpn evpn`. Moved it inside the address-family block where FRR expects it, and added the missing `segment-routing srv6 / locator MAIN` global binding.
8. **Cisco IOS-XR config used MPLS-specific command** — the IOS-XR example included `allocate-label all`, which is for MPLS-based VPNv6 (e.g., 6PE/6VPE) and is not used for SRv6. Removed it and added the global `segment-routing srv6 / locator` block at the BGP instance level, which is required on IOS-XR.

## Review Notes
- RFC 9252 and RFC 9256 references are accurate (titles confirmed against the IETF datatracker).
- The Step 2 `show bgp l2vpn evpn detail | grep "SRv6"` example output is illustrative — actual output formatting depends on FRR version. Considered acceptable as a verification hint.
- The `update-source lo` directive is valid on Linux/FRR (interface name) for an iBGP session, though some operators prefer to use a specific IPv6 address; left unchanged as it is not technically incorrect.
- The author may want to expand on `rd vpn import` vs `rt vpn both` semantics in a future revision, since these were missing entirely from the original Step 1.
- The "BGP-LU" tag is somewhat unrelated to SRv6 (BGP Labeled Unicast is an MPLS construct); kept as-is since tags are author-discretion and not technical claims.
