# Validation Summary: How to Understand 464XLAT for IPv6-Only Mobile Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- 464XLAT
- IPv6-only mobile networking
- NAT64 and DNS64
- CLAT and PLAT
- NAT64 prefix discovery (RFC 7050 and RFC 8781)

## Sources Consulted
- RFC 6877: 464XLAT: Combination of Stateful and Stateless Translation — https://www.rfc-editor.org/rfc/rfc6877
- RFC 7050: Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis — https://www.rfc-editor.org/rfc/rfc7050
- RFC 7335: IPv4 Service Continuity Prefix — https://www.rfc-editor.org/rfc/rfc7335
- RFC 6052: IPv6 Addressing of IPv4/IPv6 Translators — https://www.rfc-editor.org/rfc/rfc6052
- RFC 8781: Discovering PREF64 in Router Advertisements — https://www.rfc-editor.org/rfc/rfc8781
- RFC 8683: Additional Deployment Guidelines for NAT64/464XLAT in Operator and Enterprise Networks — https://www.rfc-editor.org/rfc/rfc8683
- RFC 8880: Special Use Domain Name 'ipv4only.arpa' — https://www.rfc-editor.org/rfc/rfc8880
- RFC 9872: Recommendations for Discovering IPv6 Prefix Used for IPv6 Address Synthesis — https://www.rfc-editor.org/rfc/rfc9872.html
- Apple Developer: Supporting IPv6-only Networks — https://developer.apple.com/support/ipv6/
- Apple Developer: Supporting IPv6 DNS64/NAT64 Networks — https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/NetworkingOverview/UnderstandingandPreparingfortheIPv6Transition/UnderstandingandPreparingfortheIPv6Transition.html
- Android Open Source Project: `Nat464Xlat.java` — https://android.googlesource.com/platform/packages/modules/Connectivity/+/855712aa556ee5f78575a2bed407a8e0afcc8ee6/service/src/com/android/server/connectivity/Nat464Xlat.java
- Local CLI help output checked for `ip`, `ping`, and `dig`

## Issues Found
- The post treated `64:ff9b::/96` as if it were the universal NAT64 prefix. I changed the architecture and packet-flow sections to use generic `Pref64::/n` language and kept `64:ff9b::/96` only as an explicit example, because RFC 6052, RFC 7050, and RFC 8781 allow other NAT64 prefixes.
- The RFC 7050 example used the wrong `ipv4only.arpa` IPv4 constants and an incorrect synthesized address example. I corrected the well-known IPv4 addresses to `192.0.0.170` and `192.0.0.171`, updated the synthesized IPv6 examples accordingly, and clarified that the DNS64 recursive resolver returns the synthesized AAAA records.
- The post described `192.0.0.0/29` as a private IPv4 address. I changed that wording to a special-purpose IPv4 block, which matches RFC 7335.
- The step-by-step flow said the CLAT source becomes the device's normal IPv6 ULA/GUA. I corrected this to describe a CLAT-generated IPv6 source address, which better reflects the RFC 6877/RFC 6052 translation model.
- The comparison table overstated 464XLAT platform behavior by claiming full Android/iOS support and saying 464XLAT does not require DNS in absolute terms. I replaced that row with an OS-support description that matches current sources and changed the DNS row to say DNS64 is optional for 464XLAT.
- The deployment section overstated scope by claiming named carriers, full internet compatibility, and mobile IPv6 ratios above 80% without authoritative support in the post. I replaced that with RFC 8683-backed language and narrowed compatibility claims to client-server access to IPv4-only services.
- The testing section assumed fixed interface names such as `clat` and `nat64`. I changed the commands to generic interface inspection and noted Android's current AOSP `v4-<base>` naming, because Linux CLAT interface names vary by implementation.
- The inline `connect("8.8.8.8", 53)` example looked like a real API call but was not valid as written for common socket APIs. I rewrote it as a code-agnostic IPv4-literal example.

## Review Notes
- RFC 9872 now recommends preferring PREF64 discovery via Router Advertisements (RFC 8781) over RFC 7050 when available. The post now mentions RFC 8781, but a future revision could expand on why newer networks may prefer RA-based discovery.
- RFC 6877 defines 464XLAT as providing limited IPv4 connectivity for client-server use, not full inbound IPv4 or general peer-to-peer semantics. The revised text now avoids overstating that scope.
