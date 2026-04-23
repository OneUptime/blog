# Validation Summary: How to Understand Reverse ARP (RARP)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Reverse Address Resolution Protocol (RARP)
- Address Resolution Protocol (ARP)
- IPv4 over Ethernet
- BOOTP
- DHCP
- tcpdump/libpcap capture filters

## Sources Consulted
- RFC 903, "A Reverse Address Resolution Protocol": https://datatracker.ietf.org/doc/html/rfc903
- RFC 826, "An Ethernet Address Resolution Protocol": https://datatracker.ietf.org/doc/html/rfc826
- IANA Address Resolution Protocol (ARP) Parameters: https://www.iana.org/assignments/arp-parameters/arp-parameters.xhtml
- IANA IEEE 802 Numbers / Ethertypes registry: https://www.iana.org/assignments/ieee-802-numbers/ieee-802-numbers.xhtml
- RFC 951, "Bootstrap Protocol": https://datatracker.ietf.org/doc/html/rfc951
- RFC 2131, "Dynamic Host Configuration Protocol": https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132, "DHCP Options and BOOTP Vendor Extensions": https://www.rfc-editor.org/rfc/rfc2132.html
- pcap-filter(7) Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local tcpdump 4.99.4/libpcap 1.10.4 filter compilation using `tcpdump -d rarp` and `tcpdump -d 'ether proto 0x8035'`.

## Issues Found
- Clarified that the 28-byte RARP packet size applies to Ethernet/IPv4 ARP-style payloads, because RFC 903 defines a variable format based on hardware and protocol address lengths.
- Added the missing hardware address length and protocol address length fields to the packet-format table.
- Corrected the RARP request protocol-address fields from fixed `0.0.0.0` values to RFC 903's `undefined` semantics, while preserving the common IPv4 display convention.
- Corrected the BOOTP timing from "late 1980s" to BOOTP being standardized in 1985.
- Softened absolute obsolete/modern OS wording to avoid overclaiming. RARP is operationally obsolete, but the original categorical phrasing was stronger than the sources support.

## Review Notes
The tcpdump commands are syntactically valid. Both `rarp` and `ether proto 0x8035` compile to an EtherType 0x8035 filter on this system, and the related OneUptime links returned HTTP 200 during review.
