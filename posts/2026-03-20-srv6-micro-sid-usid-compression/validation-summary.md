# Validation Summary: How to Understand SRv6 micro-SID (uSID) Compression

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Segment Routing over IPv6 (SRv6)
- SRv6 micro-SID/uSID and NEXT-CSID compression
- IPv6 Segment Routing Header (SRH)
- Linux `iproute2` `seg6local` configuration
- Cisco IOS XR SRv6 locator configuration
- Python `ipaddress`

## Sources Consulted
- RFC 9800, "Compressed SRv6 Segment List Encoding": https://datatracker.ietf.org/doc/html/rfc9800
- RFC 9631, "The IPv6 Compact Routing Header (CRH)": https://www.rfc-editor.org/rfc/rfc9631.html
- RFC 8754, "IPv6 Segment Routing Header (SRH)": https://datatracker.ietf.org/doc/html/rfc8754
- RFC 9602, "Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture": https://datatracker.ietf.org/doc/html/rfc9602
- IANA IPv6 Special-Purpose Address Space registry for `5f00::/16`: https://www.iana.org/assignments/iana-ipv6-special-registry
- Linux `ip-route(8)` manual for `seg6local` and `flavors next-csid`: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel Segment Routing sysctl documentation: https://docs.kernel.org/networking/seg6-sysctl.html
- Cisco IOS XR Segment Routing Configuration Guide, "Configure Segment Routing over IPv6 (SRv6) with Micro-SIDs": https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/25xx/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-25xx/configure-srv6-micro-sid.html
- Local verification with `iproute2-6.1.0` `ip -6 route help` and Python execution of the corrected `ipaddress` example.

## Issues Found
- The post cited RFC 9631 as the uSID compression RFC. RFC 9631 defines the IPv6 Compact Routing Header experiment, not SRv6 uSID/NEXT-CSID compression. Updated the tag and introduction to RFC 9800.
- The uSID container layout used a one-hextet block, claimed eight 16-bit slots, and used `ffff` as an end marker. Updated the examples to F3216: a 32-bit uSID block, up to six 16-bit uSID IDs, and zero-filled End-of-Carrier slots.
- The processing diagram used the same incorrect `ffff` marker and block layout. Updated the destination addresses and final-processing note to match zero-filled NEXT-CSID/uSID behavior.
- The Linux example used non-upstream `iproute2` syntax (`action uN`) and an inaccurate kernel version claim. Updated it to `action End flavors next-csid lblen 32 nflen 16` and added the SRv6 `seg6_enabled` sysctls.
- The Cisco IOS XR example used unsupported locator fields for the cited platform guide. Replaced them with the documented `micro-segment behavior unode psp-usd` command and a /48 uSID locator prefix.
- The "32-bit Micro-SIDs (f3216 format)" section misdescribed F3216. Updated it to "32-bit block, 16-bit uSIDs" and corrected the sample encoding.
- The Python packing function had an off-by-one slot calculation that raised a negative-shift exception and encoded the wrong `ffff` marker. Corrected it for six F3216 uSID slots, validated 16-bit inputs, and executed the example successfully.
- The benefits table and conclusion claimed seven uSIDs per container and "same" hardware requirements. Updated them to six uSIDs for F3216 and noted that NEXT-CSID/uSID endpoint behavior support is required.

## Review Notes
The post is now technically accurate as a high-level F3216/uSID guide. Actual production deployment still depends on platform support, routing protocol advertisement of locators, SR domain security policy, and whether the operator uses reduced SRH or retains an SRH for policy metadata.
