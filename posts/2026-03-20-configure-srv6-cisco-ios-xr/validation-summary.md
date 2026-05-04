# Validation Summary: How to Configure SRv6 on Cisco IOS-XR

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS-XR
- SRv6 (Segment Routing over IPv6)
- SRv6 Micro-SIDs (uSID) with `unode psp-usd` behavior
- IS-IS (with SRv6 locator advertisement)
- BGP (VPNv6 / L3VPN over SRv6)
- SRv6 Traffic Engineering (SRv6-TE) policies, segment lists, candidate paths

## Sources Consulted
- [Cisco: Configure SRv6 with Micro-SIDs (NCS 5500, IOS XR 24.x)](https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/segment-routing/24xx/configuration/guide/b-segment-routing-cg-ncs5500-24xx/configure-srv6-micro-sid.html)
- [Cisco: Configure SRv6 with Micro-SIDs (ASR 9000, IOS XR 7.11.x)](https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/711x/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-711x/configure-srv6-micro-sid.html)
- [Cisco: Configure SRv6 Traffic Engineering (ASR 9000, IOS XR 7.8.x)](https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/asr9k-r7-8/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-78x/configure-srv6-traffic-engineering.html)
- [Cisco: Configure SRv6 Traffic Engineering (ASR 9000, IOS XR 7.11.x)](https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/711x/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-711x/configure-srv6-traffic-engineering.html)
- [Cisco: Segment Routing Command Reference (NCS 5500/540/560)](https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/segment-routing/b-segment-routing-cr-ncs5500/b-segment-routing-cr-ncs5500_chapter_01.html)
- [Cisco: Segment Routing Command Reference (Cisco 8000 Series)](https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/segment-routing/b-segment-routing-cr-8k/segment-routing-commands.html)

## Issues Found
1. **SRv6-TE policy `binding-sid` syntax** — The original post used `binding-sid address 5f00:1:0:fc00::` directly under the policy. This is not the documented IOS-XR syntax for an SRv6 binding SID. Per the SRv6 Traffic Engineering configuration guide, the binding SID for an SRv6-TE policy is configured under an `srv6` block within the policy, with a locator and a behavior such as `ub6-insert-reduced` (or `ub6-encaps-reduced`). Updated to:
   ```
   srv6
    locator MAIN
    binding-sid dynamic behavior ub6-insert-reduced
   !
   ```
2. **SRv6-TE `segment-list` missing `srv6` keyword** — A segment list that carries IPv6 SIDs must declare `srv6` so the device knows the segments are SRv6 SIDs (and not SR-MPLS labels). Added the `srv6` marker inside the `segment-list R1-R2-R3` block.
3. **IS-IS verification command** — `show isis segment-routing srv6 adjacency` is not a documented IOS-XR command. The standard command for inspecting SRv6 locators advertised by IS-IS is `show isis segment-routing srv6 locators` (and `show isis adjacency` for raw IS-IS adjacencies). Replaced with `show isis segment-routing srv6 locators` and updated the comment accordingly.

## Review Notes
- The `segment-routing srv6` line in the global config is shown collapsed onto a single header line. IOS-XR running-config is generally rendered as a nested `segment-routing` / `srv6` hierarchy, but the collapsed path form is also accepted as input on the CLI, so this was left as-is for readability.
- The locator `5f00:1::/48` together with `unode psp-usd` is consistent with Cisco's documented uSID F3216 format (16-bit block + 32-bit ID giving a /48 locator) and the recommended PSP-USD penultimate-segment-pop / ultimate-segment-decapsulation behavior.
- The verification command `show segment-routing srv6 forwarding` is left in place; while less commonly cited than `show segment-routing srv6 sid` and `show cef ipv6 <prefix>`, it is referenced in Cisco SRv6 verification flows and is harmless if unsupported on a given platform/release (the CLI parser will simply reject it).
- The `traceroute srv6-te policy <name>` form was retained; SRv6-TE traceroute support varies by release, and in older releases users may need to fall back to standard `traceroute ipv6 <end-point>` against the policy's end-point.
- IS-IS SRv6 requires `metric-style wide` (correctly included) and an IPv6 address-family; both are present.
- The BGP L3VPN-over-SRv6 stanza with `vrf ... address-family ipv6 unicast / segment-routing srv6 / locator MAIN / alloc mode per-vrf` matches the documented per-VRF SID allocation pattern.
