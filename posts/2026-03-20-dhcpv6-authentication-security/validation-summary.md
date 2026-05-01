# Validation Summary: How to Secure DHCPv6 with Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- DHCPv6 Authentication Option (Option 11)
- Reconfigure Key Authentication Protocol (RKAP)
- DHCPv6-Shield / DHCPv6 Guard
- ISC DHCP
- Nmap
- tcpdump

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 7610: DHCPv6-Shield: Protecting against Rogue DHCPv6 Servers - https://www.rfc-editor.org/rfc/rfc7610.html
- ISC: Standard DHCP Options Defined in ISC DHCP and Kea - https://kb.isc.org/docs/standard-dhcp-options
- ISC DHCP 4.4 Manual Pages - dhcp-options - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- Nmap NSE documentation: broadcast-dhcp6-discover - https://nmap.org/nsedoc/scripts/broadcast-dhcp6-discover.html
- Cisco DHCPv6 Guard documentation - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-3e/ip6f-xe-3e-book/ip6-dhcpv6-guard.html
- Local CLI help for `tcpdump` (`tcpdump --help`)

## Issues Found
- The overview treated RFC 3315 and RFC 8415 as the active standards and implied a general client/server authentication mechanism. I updated it to reference RFC 9915 and clarified that RFC 3315's delayed-authentication mechanism is obsolete.
- The Authentication Option section claimed DHCPv6 uses a shared secret with HMAC-MD5 or HMAC-SHA for general message signing. I corrected this to the current standardized reality: RFC 9915 keeps the Authentication option as a framework, and its defined base-protocol use is RKAP for Reconfigure messages using HMAC-MD5.
- The ISC DHCP server and client configuration snippets were not valid. ISC's own option support table marks DHCPv6 Auth (Option 11) as unsupported, so I removed the non-working `dhcpd6.conf` and `dhclient6.conf` examples and replaced them with accurate support-status notes.
- The `tcpdump` example relied on grepping for a renderer-specific output string. I replaced it with a direct capture command and guidance to inspect unexpected Advertise sources instead.
- The `dhcptest --solicit --interface eth0` example was not supported by the official documentation reviewed for this post. I removed it and kept the validated Nmap discovery example.

## Review Notes
- RFC 9915 was published in January 2026 and obsoletes RFC 8415. Future DHCPv6 posts should cite RFC 9915 as the base specification.
- RFC 9915's Authentication option is much narrower in practice than the post originally suggested. For rogue on-link server defense, DHCPv6 Guard / DHCPv6-Shield remains the primary operational control.
- The Cisco DHCPv6 Guard snippet is platform-specific, but the command family and behavior were verified against Cisco's DHCPv6 Guard documentation.
