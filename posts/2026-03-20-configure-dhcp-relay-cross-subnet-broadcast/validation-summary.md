# Validation Summary: How to Configure DHCP Relay for Cross-Subnet Broadcast

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP / BOOTP
- DHCP relay agents
- ISC DHCP (`isc-dhcp-relay`, `isc-dhcp-server`)
- Cisco `ip helper-address`
- Linux networking tools (`tcpdump`)
- IPv4 subnetting and broadcast forwarding

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- ISC DHCP 4.4 Manual Pages - `dhcrelay`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP 4.4 Manual Pages - `dhcpd`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC KB, Declaring subnets in ISC DHCP: https://kb.isc.org/docs/aa-00274
- ISC DHCP product/EOL page: https://www.isc.org/dhcp/
- Debian package sources for `isc-dhcp-relay` defaults: https://sources.debian.org/src/isc-dhcp/4.4.3-P1-2/debian/isc-dhcp-relay.config/
- Debian package sources for `isc-dhcp-relay` generated default file: https://sources.debian.org/src/isc-dhcp/4.4.3-P1-2/debian/isc-dhcp-relay.postinst/
- Cisco IOS DHCP relay agent documentation: https://www.cisco.com/en/US/docs/ios/12_4t/ip_addr/configuration/guide/htdhcpre.html
- Cisco IOS IP Application Services Command Reference (`ip forward-protocol` / helper defaults): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp/iap-cr-book/iap-i1.html
- tcpdump BOOTP printer source (`Gateway-IP` field label): https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/print-bootp.c

## Issues Found
- The Linux section said IP forwarding had to be enabled with `net.ipv4.ip_forward`. I removed that instruction and replaced it with a reachability/firewall note, because ISC `dhcrelay` is documented as a user-space relay that listens for client requests and forwards them upstream itself.
- The Cisco `ip helper-address` example claimed to leave only DHCP enabled, but it disabled only a subset of the default helper-forwarded UDP services. I corrected the snippet to also disable the remaining default non-DHCP ports 37, 42, 49, and 53.
- The verification command on the DHCP server grepped for `giaddr`, but tcpdump’s BOOTP output labels that field as `Gateway-IP`. I changed the command so it matches the actual tcpdump output.
- The post implied `isc-dhcp-relay` was a normal current package choice without caveat. I added a brief note that ISC DHCP is end-of-life upstream, while the Debian/Ubuntu package is still available.

## Review Notes
- ISC DHCP is upstream end-of-life. The post is still technically usable for Debian/Ubuntu environments that package it, but new deployments should evaluate maintained alternatives such as Kea where appropriate.
- The Cisco example matches classic Cisco IOS/IOS XE style `ip helper-address` behavior. Some Cisco small-business platforms expose different relay commands and defaults.
