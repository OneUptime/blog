# Validation Summary: How to Configure IPv6 DHCP Relay on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv6
- DHCPv6
- DHCPv6 relay
- Neighbor Discovery

## Sources Consulted
- Cisco IOS IPv6 Command Reference: `ipv6 dhcp relay destination` https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_05.html
- Cisco IOS IPv6 Command Reference: `show ipv6 dhcp interface` and `show ipv6 dhcp relay binding` https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_13.html
- IP Addressing Configuration Guide, Cisco IOS XE 17.x: DHCPv6 Relay Agent https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-rel-agent-xe-1.html
- IPv6 Configuration Guide: Implementing IPv6 Addressing and Basic Connectivity https://www.cisco.com/c/en/us/td/docs/ios/ipv6/configuration/guide/ipv6-xe-16-book-cat8000/m_ip6-addrg-bsc-con.html
- Cisco IOS IPv6 Command Reference: `ipv6 nd managed-config-flag` https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_07.html
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) https://www.rfc-editor.org/rfc/rfc8415.html

## Issues Found
- The post title and description were about DHCPv6 relay, but the original feature-specific configuration built a local DHCPv6 server with `ipv6 dhcp pool` and `ipv6 dhcp server`. Cisco documents DHCPv6 relay separately with `ipv6 dhcp relay destination`, and Cisco also states that DHCPv6 client, server, and relay functions are mutually exclusive on an interface. I replaced the server example with an actual relay configuration.
- The static-route example used invalid IPv6 addresses: `2001:db8:remote::/48` and `2001:db8:wan::254` are not syntactically valid because IPv6 hextets must be hexadecimal. I replaced them with valid documentation-prefix examples.
- The verification section used `show ipv6 dhcp binding`, which is a DHCPv6 server binding-table command, not the primary relay verification command. I changed it to `show ipv6 dhcp interface`, which Cisco documents for viewing relay mode and relay destinations.
- The traceroute example used `source GigabitEthernet0/1`. Cisco's traceroute documentation uses a source address in extended traceroute, not an interface name in the basic form shown here. I replaced it with a valid, simpler IPv6 traceroute example.
- The conclusion said `ipv6 unicast-routing` must be enabled before any interface IPv6 configuration will work. Cisco documents `ipv6 address` as enabling IPv6 processing on the interface, while `ipv6 unicast-routing` enables global forwarding. I corrected the explanation to match that behavior.

## Review Notes
- The prerequisite version is conservative but still based on Cisco command history; `ipv6 dhcp relay destination` appears in Cisco IOS command references starting in 12.3(11)T.
- The post now reflects a stateful DHCPv6 relay pattern by setting `ipv6 nd managed-config-flag` on the client-facing interface. If the intended use case were stateless DHCPv6 for options only, `ipv6 nd other-config-flag` would be the appropriate alternative.
