# Validation Summary: How to Configure BIND9 as a Secondary (Slave) DNS Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- BIND9
- DNS primary and secondary authoritative zones
- AXFR and IXFR zone transfers
- TSIG keys
- `dig`, `rndc`, `named-checkconf`, and `named-checkzone`
- UFW firewall rules

## Sources Consulted
- Ubuntu Server documentation: Domain Name Service (DNS) - https://ubuntu.com/server/docs/how-to/networking/install-dns/
- Ubuntu Server documentation: Firewall - https://documentation.ubuntu.com/server/how-to/security/firewalls/
- ISC BIND 9 Administrator Reference Manual, BIND 9.18 configuration reference - https://bind9.readthedocs.io/en/bind-9.18/reference.html
- ISC BIND 9 manual pages, BIND 9.20.20 - https://bind9.readthedocs.io/en/v9.20.20/manpages.html
- RFC 5936, DNS Zone Transfer Protocol (AXFR) - https://www.rfc-editor.org/rfc/rfc5936
- RFC 1995, Incremental Zone Transfer in DNS (IXFR) - https://www.rfc-editor.org/rfc/rfc1995

## Issues Found
- The prerequisites described `also-notify` as mandatory. A secondary can refresh from the SOA refresh interval without NOTIFY, so I changed this to a recommended setting for faster propagation.
- The secondary zone examples used `type slave` and `masters`. BIND still recognizes the older terminology in many supported versions, but current ISC documentation prefers `type secondary` and `primaries`, so I updated the examples.
- The primary zone example used `type master`. Current BIND terminology uses `type primary`, so I updated the example while preserving the same behavior.
- The section "Adding the Secondary to Your SOA Record" actually showed NS records, not an SOA record. I corrected the heading to "Adding the Secondary to Your NS Records".
- The closing note said zone transfers use TCP. AXFR uses TCP, but IXFR can be attempted over UDP and may need TCP if the response does not fit in one UDP packet, so I clarified the wording.

## Review Notes
The rest of the commands and configuration snippets are consistent with Ubuntu's BIND9 layout and BIND9 documentation. One future improvement would be to show a complete TSIG-protected `primaries { ... key ...; };` and `allow-transfer { key ...; };` example, but the existing TSIG mention is not technically incorrect.
