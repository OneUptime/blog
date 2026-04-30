# Validation Summary: How to Understand ICMPv6 Error vs Informational Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6
- RFC 4443
- RFC 4890
- RFC 4861
- RFC 3810
- RFC 8201
- Linux ICMPv6 sysctls
- Python

## Sources Consulted
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc4443
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls - https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 3810: Multicast Listener Discovery Version 2 (MLDv2) for IPv6 - https://www.rfc-editor.org/rfc/rfc3810
- RFC 8201: Path MTU Discovery for IP version 6 - https://www.rfc-editor.org/rfc/rfc8201
- IANA ICMPv6 Parameters registry - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Linux kernel IP Sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The description said ICMPv6 error messages were `Types 1-127`. I corrected this to `Types 0-127` to match RFC 4443 and the IANA registry.
- The error-message rules block used an imprecise size rule, omitted Redirect and link-layer multicast/broadcast exclusions, and said rate limiting `SHOULD` be used. I corrected the wording to match RFC 4443, which requires including as much of the invoking packet as possible without exceeding the IPv6 minimum MTU and requires rate limiting of error messages.
- The "Current error messages" code ranges were outdated. I updated Destination Unreachable to `Codes 0-9`, Packet Too Big to `Code 0`, and Parameter Problem to `Codes 0-10` based on the current IANA registry.
- The "Current informational messages" heading implied an exhaustive list even though many assigned informational types now exist beyond those shown. I changed it to "Common informational messages" to keep the list accurate.
- The firewall section treated some ICMPv6 types too broadly. I corrected it to reflect RFC 4890's code-specific recommendations for `Time Exceeded` and `Parameter Problem`, and clarified that ND/MLD traffic is local-link traffic rather than generic transit traffic.
- The echo-message firewall guidance said Echo Request/Reply could simply be blocked if `ping6` was not needed. I changed this to note that blocking Echo can interfere with diagnostics and some connectivity checks.
- The Python example claimed to provide firewall guidance using only the ICMPv6 type, even where guidance depends on the code field. I changed it to provide high-level handling notes instead, added range validation for `0..255`, and updated the example comment so it no longer claims to test all known types.
- The Linux rate-limiting section described `ratemask` as a burst-size bitmask and gave an incorrect default/behavior description for `ratelimit`. I corrected this to match current Linux kernel documentation: `ratelimit` is the per-peer spacing in milliseconds, and `ratemask` is a comma-separated list of ICMPv6 type ranges subject to rate limiting.
- The conclusion overstated the effect of blocking Packet Too Big by saying it breaks PMTUD for all IPv6 TCP connections. I corrected this to the more accurate RFC 8201 behavior: blocking Type 2 breaks classical IPv6 PMTUD and can black-hole TCP connections.

## Review Notes
- ICMPv6 type and code assignments continue to grow in the IANA registry, so posts that present "current" code ranges should be checked against the live registry rather than only RFC 4443.
- MLDv1 message types `131` and `132` remain assigned and appear in the registry even though newer deployments commonly use MLDv2 (`143`).
