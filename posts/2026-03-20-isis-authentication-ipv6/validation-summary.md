# Validation Summary: How to Configure IS-IS Authentication for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IS-IS
- IPv6
- Cisco IOS / IOS XE
- Cisco IOS XR
- Junos OS
- FRRouting
- IS-IS authentication RFCs

## Sources Consulted
- RFC 1195: https://www.rfc-editor.org/rfc/rfc1195
- RFC 3787: https://www.rfc-editor.org/rfc/rfc3787.html
- RFC 5304: https://www.rfc-editor.org/rfc/rfc5304
- RFC 5310: https://www.rfc-editor.org/rfc/rfc5310
- Cisco IOS XE, Enhancing Security in an IS-IS Network: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/configuration/xe-16-12/irs-xe-16-12-book/irs-scty.html
- Cisco IOS XE, IPv6 Routing: IS-IS Support for IPv6: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/configuration/xe-3s/irs-xe-3s-book/ip6-route-isis-xe.html
- Cisco IOS XR, Implementing IS-IS: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/routing/24xx/configuration/guide/b-routing-cg-cisco8000-24xx/implement-is-is.html
- Cisco IOS XR, Keychain Management Commands: https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/security/b-system-security-cr-ncs5500/keychain-management-commands.html
- Junos OS, Configuring IS-IS Authentication: https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/routing-configuring-is-is-authentication.html
- Junos OS, Understanding Hitless Authentication Key Rollover for IS-IS: https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/authentication-hitless-keychain-isis.html
- FRRouting ISIS documentation: https://docs.frrouting.org/en/stable-10.0/isisd.html

## Issues Found
- The authentication scope table said modern deployments use "TLV 10 or TLV 133". I changed this to `TLV 10` because RFC 3787 says RFC 1195 TLV 133 was replaced by TLV 10 and must be ignored in interoperable IP IS-IS deployments.
- The Cisco IOS example mixed `isis authentication mode md5` with a key-chain line using `cryptographic-algorithm hmac-sha-256`, which does not match Cisco IOS/XE IS-IS authentication syntax. I removed the SHA-256 line, kept the MD5-based IOS/XE workflow, and made the IS-IS process tag consistent.
- The Cisco IOS interface example did not show the IPv6 IS-IS process attachment on the interface. I added `ipv6 router isis CORE` so the example reflects an IPv6 IS-IS interface configuration.
- The FRRouting example used Cisco-style IS-IS commands (`isis authentication mode` and `isis authentication key-chain`) plus an HMAC-SHA-256 key chain. FRR documents `isis password [clear | md5]`, `area-password`, and `domain-password` for IS-IS, so I replaced the FRR snippet with the documented MD5-based configuration and added `ipv6 router isis CORE`.
- The SHA section overstated platform support and showed an unverified Cisco IOS-XR snippet. I replaced it with a verified IOS XR keychain-based HMAC-SHA-256 example and narrowed the Junos statement to supported platforms beginning with Junos OS Release 24.2R1.
- The Cisco verification section used commands that were not the best documented IOS/XE forms for this post, including `show isis database verbose R2.00-00`. I replaced that section with documented `show clns is-neighbors detail` and `show isis database detail` examples.
- The migration section only showed router-level `authentication send-only`, which is incomplete if you are also enabling hello authentication. I updated it to include interface-level `isis authentication send-only` alongside router-level send-only commands for LSP/SNP authentication.

## Review Notes
- IS-IS authentication protects the IS-IS control plane regardless of whether the deployment carries IPv4, IPv6, or both. The IPv6-specific parts are the interface and process enablement commands.
- Cisco IOS/XE documentation consulted for IS-IS authentication still documents MD5 or clear-text authentication for the classic IOS/XE workflow; the SHA-based example in the post now uses Cisco IOS XR instead.
- Junos SHA-2 support for IS-IS is release- and platform-dependent; the relevant Junos documentation indicates support beginning with Junos OS Release 24.2R1 on supported platforms.
