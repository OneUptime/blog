# Validation Summary: How to Configure DHCPv6 Relay on MikroTik

## Status
validated

## Post Type
Guide

## Technologies Covered
- MikroTik RouterOS 7.x
- DHCPv6 relay
- IPv6 Neighbor Discovery / Router Advertisements
- RouterOS IPv6 firewall filtering
- RouterOS logging and packet capture

## Sources Consulted
- MikroTik RouterOS documentation, "DHCP" - https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP
- MikroTik RouterOS documentation, "IPv6 Neighbor Discovery" - https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery
- MikroTik RouterOS documentation, "IP Addressing" - https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP%20Addressing
- MikroTik RouterOS documentation, "Packet Sniffer" - https://help.mikrotik.com/docs/spaces/ROS/pages/8323088/Packet%20Sniffer
- MikroTik RouterOS documentation, "Log" - https://help.mikrotik.com/docs/spaces/ROS/pages/328094/Log
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862.html

## Issues Found
- The post used `local-address`, which is the IPv4 DHCP relay field. RouterOS DHCPv6 relay uses `link-address`, so I corrected the CLI examples, the Winbox field name, and the concluding explanation.
- The placeholder server values `2001:db8::dhcp-server` and `2001:db8::dhcp1` were not valid IPv6 addresses. I replaced them with valid example addresses from the documentation prefix space.
- The Router Advertisement examples used `set [find interface=ether2]` without first creating an `ether2` ND entry. On a fresh configuration that can fail, so I changed the stateful example to `add interface=ether2` and left the stateless example as a modification of that same entry.
- The original address example used `advertise=yes` while the post also configured `/ipv6 nd prefix` separately. I changed the interface address example to `advertise=no` so RA prefix behavior is controlled consistently from the ND section.
- The monitoring and troubleshooting sections used `/ipv6 dhcp-client print` and `/ipv6 dhcp-server print`, which inspect the router's own DHCPv6 client/server roles rather than relayed clients. I replaced them with `ipv6 neighbor`, DHCP log inspection, and a documented packet sniffer command.
- The firewall section and conclusion simplified DHCPv6 relay ports too far. I corrected the examples and wording to reflect client-to-relay traffic on UDP 546/547, relay-to-server traffic on UDP 547/547, and relay replies back to clients on UDP 547/546 when output filtering is in use.

## Review Notes
- RouterOS documents that DHCPv6 relay requires IPv6 forwarding to be enabled.
- Host behavior around RA M/O flags is not perfectly uniform across operating systems; some clients still expect a usable advertised prefix even when DHCPv6 is enabled.
- RouterOS also exposes `store-relayed-bindings=yes` for DHCPv6 relay if retaining relayed prefix information across reboot matters in a given deployment.
