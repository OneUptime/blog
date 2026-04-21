# Validation Summary: How to Understand SRv6 Security Considerations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SRv6
- IPv6 Segment Routing Header (SRH)
- RFC 8754 HMAC TLV
- Linux iproute2 SRv6 commands
- Linux seg6 sysctl settings
- ip6tables IPv6 extension-header matching
- Cisco IPv6 ACLs

## Sources Consulted
- RFC 8754: IPv6 Segment Routing Header (SRH) - https://www.rfc-editor.org/rfc/rfc8754.html
- RFC 8986: Segment Routing over IPv6 (SRv6) Network Programming - https://www.rfc-editor.org/rfc/rfc8986.html
- RFC 9602: Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc9602.html
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Linux kernel seg6 sysctl documentation - https://www.kernel.org/doc/html/latest/networking/seg6-sysctl.html
- iproute2 ip-sr(8) manual - https://man7.org/linux/man-pages/man8/ip-sr.8.html
- iptables-extensions(8) manual - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Cisco IPv6 routing header filtering advisory - https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-20070124-IOS-IPv6.html

## Issues Found
- The attack example used non-IPv6 placeholders such as `5f00:internal:...`. Replaced them with valid `5f00::/16` SRv6 SID examples.
- The bash examples placed inline comments after line-continuation backslashes, which would break shell parsing. Moved comments to their own lines.
- The ip6tables `ipv6header` match used `--header routing`, but the valid header names include `route` and `ipv6-route`. Changed the examples to `--header route`.
- The Linux HMAC command incorrectly passed a hex key on the `ip sr hmac set` command line and used uppercase `SHA256`. Changed it to `ip sr hmac set 1 sha256`, matching iproute2 syntax, and noted that the command prompts for the shared secret.
- The Linux HMAC sysctl example did not enable SRv6 processing on the interface. Added `net.ipv6.conf.eth0.seg6_enabled=1` before requiring HMAC.
- The Python HMAC example did not match RFC 8754 input fields, omitted required imports, and truncated SHA-256 output to 16 octets. Updated it to include the IPv6 source address, SRH Last Entry, Flags, HMAC D/reserved field, HMAC Key ID, and all Segment List addresses, and to return the RFC 8754 32-octet maximum HMAC field.
- The topology disclosure sentence implied that every SID is a node address. Reworded it to say SID locators can identify SR nodes.
- The Cisco IOS-XR infrastructure ACL example used IOS-style `routing-type 4` syntax with a trailing `any`. Changed the IOS-XR example to use the `routing` keyword, which Cisco documents for matching IPv6 Routing Headers on IOS XR.
- The Linux blackhole-route example used `dev null`, which assumes a nonexistent netdevice. Changed it to `ip -6 route add blackhole 5f00:1::/32`.
- The threat heading used "SRH Amplification" for a processing-cost concern. Renamed it to "SRH Processing Overhead" and aligned the checklist wording.

## Review Notes
Examples are still illustrative and must be adapted to the target platform and SR domain policy. Cisco ACL syntax varies by IOS, IOS XE, IOS XR, platform, and release; the post now separates the generic Cisco `routing-type 4` comment from the IOS-XR `routing` iACL example. HMAC key distribution and policy selection remain deployment-specific, as RFC 8754 leaves those details to local configuration.
