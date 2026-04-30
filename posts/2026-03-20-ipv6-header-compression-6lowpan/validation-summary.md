# Validation Summary: How to Understand IPv6 Header Compression in 6LoWPAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- 6LoWPAN
- RFC 6282 LOWPAN_IPHC
- RFC 6282 LOWPAN_NHC / UDP header compression
- IEEE 802.15.4
- Linux `tcpdump`
- Wireshark
- Contiki-NG

## Sources Consulted
- RFC 6282, "Compression Format for IPv6 Datagrams over IEEE 802.15.4-Based Networks": https://www.rfc-editor.org/rfc/rfc6282.html
- RFC 4944, "Transmission of IPv6 Packets over IEEE 802.15.4 Networks": https://www.rfc-editor.org/rfc/rfc4944
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- Linux-wpan documentation: https://linux-wpan.org/documentation.html
- Wireshark display filter reference for `6lowpan`: https://www.wireshark.org/docs/dfref/6/6lowpan.html
- Wireshark display filter reference for `wpan`: https://www.wireshark.org/docs/dfref/w/wpan.html
- Wireshark User's Guide note on filtering by protocol name: https://www.wireshark.org/download/docs/Wireshark%20User%27s%20Guide.pdf
- Contiki-NG logging documentation: https://docs.contiki-ng.org/en/develop/doc/tutorials/Logging.html
- Contiki-NG IPv6-over-BLE configuration example showing `SICSLOWPAN_CONF_COMPRESSION_THRESHOLD`: https://docs.contiki-ng.org/en/master/doc/programming/IPv6-over-BLE.html
- Local `tcpdump --help` output from `tcpdump 4.99.4`

## Issues Found
- The next-header compression section incorrectly referred to the `TF` field and implied RFC 6282 LOWPAN_NHC compresses TCP and ICMPv6. I corrected it to use the `NH` bit and to state that RFC 6282 defines LOWPAN_NHC for IPv6 extension headers and UDP.
- The address compression section oversimplified the 16-bit stateless format as "prefix + 16-bit short address". I corrected it to the RFC 6282 `fe80::0000:00ff:fe00:XXXX` mapping and clarified that fully elided addresses derive the IID from the encapsulating header.
- The practical IPv6+UDP size example understated the compressed size and described UDP port compression inaccurately. I corrected it to reflect the 1-byte UDP LOWPAN_NHC header, the special `0xf0b0-0xf0bf` port compression range, and the RFC 6282 rule that checksum elision requires additional integrity protection.
- The packet-capture comment described `lowpan0` as an 802.15.4 interface. I corrected the wording to identify it as a Linux 6LoWPAN interface.
- The compression-context section incorrectly treated link-local `fe80::/64` as a stateful context and used an invalid IPv6 prefix example containing `mesh`. I corrected the context explanation and replaced the invalid example with a valid documentation prefix.

## Review Notes
- The post's headline claim that LOWPAN_IPHC can reduce the IPv6 header to 2 bytes in the best case is consistent with RFC 6282.
- The conclusion's 2-7 byte figure is accurate for the IPv6 header itself; the larger corrected numbers in the worked example apply to combined IPv6+UDP headers.
