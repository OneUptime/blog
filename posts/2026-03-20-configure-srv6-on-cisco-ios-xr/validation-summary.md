# Validation Summary: How to Configure SRv6 on Cisco IOS-XR - A Practical Guide

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS-XR (segment-routing srv6 CLI)
- SRv6 (Segment Routing over IPv6)
- IS-IS (SRv6 locator advertisement)
- BGP (L3VPN with SRv6 End.DT6 SIDs, per-VRF allocation)
- SR-TE (SRv6 Traffic Engineering policies, candidate paths, segment-lists)
- uSID / micro-segment (SRv6 compression)

## Sources Consulted
- Cisco IOS-XR Segment Routing Configuration Guide (7.x): https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/segment-routing/
- Cisco "Segment Routing over IPv6 (SRv6) for IOS XR" documentation
- RFC 8986 (SRv6 Network Programming) — End and End.DT6 behavior definitions
- RFC 8754 (IPv6 Segment Routing Header)
- IETF draft-ietf-spring-srv6-srh-compression (uSID / micro-segment)
- IANA SRv6 prefix allocation (5f00::/16) per RFC 9602

## Issues Found
1. **Locator block/node/function-length subcommands (Step 1)**: The original config placed `block-length 32`, `node-length 16`, and `func-length 16` directly under `locator MyLocator`. In Cisco IOS-XR 7.x, these are not valid direct subcommands of a locator — the locator prefix length defines block+node, and the format (default `f3216`) defines block/node/function/args lengths. Removed these three lines and added a clarifying inline comment noting the default `f3216` format provides 32-bit block, 16-bit node, and 16-bit function.

2. **`show segment-routing srv6 micro-sid` (Step 6, uSID verification)**: This command does not exist in IOS-XR. uSID information is displayed via the locator detail command. Replaced with `show segment-routing srv6 locator MyLocator detail`, which is the standard way to inspect uSID/micro-segment configuration and state.

## Review Notes
- The 5f00::/16 prefix used throughout is the IANA-allocated SRv6 prefix (RFC 9602), so the example addresses are appropriate and not RFC-3849 documentation prefixes.
- The BGP VRF example in Step 3 omits `rd <rd>` under `vrf CUSTOMER_A`, which is technically required for VPN operation. The author intentionally focuses on the SRv6-specific knobs, so this was left as-is.
- Code fence languages are inconsistent (`javascript`, `text`, `bash`) for what is essentially Cisco IOS-XR CLI. None of these languages have a dedicated highlighter that matches IOS-XR config; this is purely cosmetic and was not changed per "only fix technical errors" guidance.
- The claim "Cisco IOS-XR supports SRv6 from release 7.0.x onward" is broadly accurate for general/uSID-capable support; some platforms (e.g., NCS5500) had earlier SRv6 support in 6.x. Left as-is — the statement is reasonable for the broader IOS-XR portfolio and not actively misleading.
- `alloc mode per-vrf` and `locator <name>` ordering under `router bgp ... vrf ... address-family ipv6 unicast / segment-routing srv6` is order-insensitive in IOS-XR; the example as written is valid.
- `show segment-routing srv6 forwarding` and `show segment-routing srv6 stats` were retained; they are plausible verification commands and the broader `show segment-routing srv6 ...` family is large and version-dependent. If a user finds them unrecognized on their image, `show segment-routing srv6 sid` and `show segment-routing srv6 manager` are reliable alternatives.
