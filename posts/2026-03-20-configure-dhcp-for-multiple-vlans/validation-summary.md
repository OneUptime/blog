# Validation Summary: How to Configure DHCP for Multiple VLANs

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv4
- VLANs and routed VLAN interfaces
- ISC DHCP (`dhcpd` and `dhcrelay`)
- Cisco IOS DHCP relay (`ip helper-address`)
- Debian/Ubuntu service packaging for ISC DHCP

## Sources Consulted
- ISC DHCP 4.4 `dhcpd` manual pages: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.4 `dhcpd.conf` manual pages: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC KB, "Declaring the subnets in ISC DHCP": https://kb.isc.org/docs/aa-00274
- ISC DHCP 4.4 `dhcrelay` manual pages: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP project status / EOL notice: https://www.isc.org/dhcp/
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- Cisco IOS DHCP relay agent documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-sy/dhcp-15-sy-book/dhcp-relay-agent.html
- Debian source for `isc-dhcp-relay` init script: https://sources.debian.org/src/isc-dhcp/4.2.2.dfsg.1-5%2Bdeb70u8/debian/isc-dhcp-relay.init.d
- Debian source for `isc-dhcp-server` init script: https://sources.debian.org/src/isc-dhcp/4.3.5-3%2Bdeb9u1/debian/isc-dhcp-server.init.d/

## Issues Found
- The post described the architecture too narrowly by implying only multiple DHCP servers or relays were valid. I corrected the description to also cover DHCP running on the router or switch, which the post itself later discusses.
- The `dhcpd.conf` example omitted the server's directly connected subnet (`10.0.0.0/24`). ISC DHCP requires a subnet declaration for directly connected networks even when no leases are handed out there, so I added an empty server-facing subnet block.
- The `dhcrelay` example only listened on client VLAN sub-interfaces. In the shown topology, server replies arrive via the upstream/server-facing interface, so I added `-iu eth0` and updated the Debian/Ubuntu service example to pass that option.
- The verification section incorrectly told readers to bind `isc-dhcp-server` to all VLAN sub-interfaces in a relay-based design. I corrected it to bind to the server-facing interface for relayed VLANs and updated the takeaway text to match.
- The post presented ISC DHCP as a normal current choice even though ISC has declared it end-of-life. I added a brief note so readers understand the example is for existing deployments and that Kea is preferred for new ones.

## Review Notes
- The `/etc/default/isc-dhcp-relay` and `/etc/default/isc-dhcp-server` examples are Debian/Ubuntu package conventions; other distributions may manage `dhcpd` and `dhcrelay` differently.
- The Cisco `ip helper-address` example is technically correct, but the same helper configuration would need to be applied on every routed VLAN interface that should relay DHCP to the central server.
