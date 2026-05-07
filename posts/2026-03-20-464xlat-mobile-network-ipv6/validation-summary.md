# Validation Summary: How to Set Up 464XLAT for Mobile Network IPv6 Transition

## Status
validated

## Post Type
Guide

## Technologies Covered
- 464XLAT
- NAT64 / PLAT
- CLAT / clatd
- TAYGA
- DNS64
- Unbound
- Android networking
- iOS IPv6-only networking
- Linux routing and iptables

## Sources Consulted
- RFC 6877: 464XLAT: Combination of Stateful and Stateless Translation: https://datatracker.ietf.org/doc/html/rfc6877
- RFC 8683: Additional Deployment Guidelines for NAT64/464XLAT in Operator and Enterprise Networks: https://datatracker.ietf.org/doc/html/rfc8683
- RFC 7050: Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880: Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.html
- TAYGA man page: https://manpages.debian.org/unstable/tayga-core/tayga.8.en.html
- TAYGA configuration man page: https://manpages.debian.org/testing/tayga-core/tayga.conf.5.en.html
- TAYGA upstream README and sample routing example: https://sources.debian.org/src/tayga/0.9.2-4/README
- `clatd` upstream README: https://github.com/toreanderson/clatd
- Debian `clatd` package page: https://packages.debian.org/trixie/net/clatd
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Android Open Source Project `clatd` source: https://android.googlesource.com/platform/external/android-clat/+/8ab7e133323376d79d280ba60f2d994bfd9a9ab9/clatd.c
- Apple Developer IPv6-only networking guidance: https://developer.apple.com/support/ipv6/

## Issues Found

1. **PLAT/TAYGA role was described too broadly**: The post treated TAYGA as if it directly implemented the provider-side stateful NAT64 PLAT. I changed the wording to clarify that RFC 6877/8683 define the PLAT as stateful NAT64, while TAYGA itself is stateless NAT64 and is suitable here as a lab component when paired with IPv4 masquerading.

2. **The TAYGA host-side interface and routing commands were incorrect**: The original commands assigned TAYGA's translator addresses directly to the `nat64` interface and omitted the route for the dynamic IPv4 pool. I replaced them with host-side interface addresses, added the missing IPv4 route for `dynamic-pool`, enabled IPv6 forwarding, and scoped the `MASQUERADE` rule to the translated IPv4 pool in line with TAYGA's documented setup.

3. **The CLAT example used the wrong IPv4 address and RFC reference**: The post configured `clat-v4-addr=192.0.0.2` and described it as RFC 6598 space. I corrected this to `192.0.0.1` and updated the note to RFC 7335 service continuity addressing, which matches `clatd`'s documented default behavior.

4. **DNS64 was incorrectly presented as mandatory for 464XLAT**: RFC 6877 explicitly states that 464XLAT does not require DNS64 for IPv4 packet flows through the CLAT/PLAT path. I rewrote the section to explain that DNS64 is commonly deployed for AAAA synthesis and prefix discovery, but IPv4-literal traffic can still work when the CLAT knows the Pref64::/n.

5. **The verification expectations were wrong in multiple places**: I changed `ping6` to `ping -6`, corrected the `ipv4only.arpa` expectation so it refers to synthesized AAAA records embedding `192.0.0.170` and `192.0.0.171`, and fixed the traceroute note to reflect the typical Linux `clatd`/TAYGA first-hop behavior instead of claiming the first hop would be the CLAT interface itself.

6. **The Android and iOS platform claims were inaccurate or unsupported**: I corrected Android from "clatd in the kernel" to the documented userspace `clatd` implementation used by Android, and I replaced the unverified iOS-native-CLAT claim with Apple's documented support for IPv6-only DNS64/NAT64 networks and App Store IPv6-only compatibility requirement.

## Review Notes
- The examples still use documentation prefixes and example addresses such as `2001:db8::/32`, `203.0.113.0/24`, and `192.0.2.0/24`; they are appropriate for documentation but must be replaced in a real deployment.
- `eth0` in the firewall and `MASQUERADE` examples is a placeholder uplink interface name.
- The PLAT example remains a lab-style approximation. Production mobile networks typically use dedicated stateful NAT64 platforms rather than TAYGA.
