# Validation Summary: How to Configure DHCPv6 Relay on Cisco Routers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cisco IOS / IOS-XE DHCPv6 relay
- Cisco IOS XR DHCPv6 relay
- Cisco NX-OS DHCPv6 relay
- IPv6 Neighbor Discovery router advertisement flags
- DHCPv6 relay options and VRF-aware relay

## Sources Consulted
- Cisco IOS IPv6 Command Reference: `ipv6 dhcp relay destination`, `ipv6 dhcp-relay option vpn`, `ipv6 dhcp relay source-interface` — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference: `show ipv6 dhcp interface`, `show ipv6 dhcp relay binding` — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS XE 17.x IP Addressing Configuration Guide: IPv6 Access Services: DHCPv6 Relay Agent — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-rel-agent-xe-2.html
- Cisco IOS XE 17.x IP Addressing Configuration Guide: DHCPv6 Relay and Server - MPLS VPN Support — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-ser-rel-mpls-vpn-xe.html
- Cisco IOS XE DHCPv6 Ethernet Remote ID Option — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/xe-3se/3650/dhcp-xe-3se-3650-book/dhcpv6-eth-rem-opt.html
- Cisco IOS XR Implementing DHCP (relay profile and helper-address) — https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/ip-addresses/25xx/configuration/guide/b-ip-addresses-cg-8k-25xx/implementing-dhcp.html
- Cisco Nexus 9000 Series NX-OS Security Configuration Guide Release 10.6(x): Configuring DHCP — https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/security/cisco-nexus-9000-series-nx-os-security-configuration-guide-release-106x/m-configuring-dhcp.pdf
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://www.rfc-editor.org/rfc/rfc4861
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4649: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) Relay Agent Remote-ID Option — https://www.rfc-editor.org/rfc/rfc4649.html

## Issues Found

1. **Several IPv6 addresses in the examples were not valid IPv6 literals.** The original snippets used placeholders such as `2001:db8::dhcp-server`, `2001:db8::dhcp1`, and `2001:db8::dhcp2`, which are not syntactically valid IPv6 addresses. Replaced them with valid documentation-prefix addresses.

2. **The IOS/IOS-XE source-interface example used the wrong syntax.** `ipv6 dhcp relay destination ... GigabitEthernet0/0` specifies an output interface for the relay destination, not the relay source interface. Updated the example to use the documented `ipv6 dhcp relay source-interface` command and added a loopback with a stable global unicast address.

3. **The Option 37 / Option 18 section described unsupported manual configuration.** The original `ipv6 dhcp relay option enterprise-id` command is not a documented IOS/IOS-XE DHCPv6 relay command, and the post implied manual configuration of Remote-ID and Interface-ID. Updated the section to reflect Cisco’s documented behavior: Remote-ID on Ethernet interfaces and Interface-ID handling are automatic, while VRF-aware relay is enabled with `ipv6 dhcp-relay option vpn` and `ipv6 dhcp relay option vpn`.

4. **The IOS-XR relay configuration was incorrect.** The original example used IOS-style `relay destination` syntax under `dhcp ipv6`, which does not match current IOS XR relay configuration. Replaced it with the documented relay profile model using `profile ... relay`, `helper-address`, interface attachment, and `commit`.

5. **The NX-OS verification example included a nonstandard binding command for this context.** The original example used `show ipv6 dhcp relay binding`, while the current NX-OS DHCPv6 relay documentation documents commands such as `show ipv6 dhcp relay` and `show ipv6 dhcp relay statistics`. Updated the section accordingly.

6. **The IOS/IOS-XE verification and troubleshooting commands were partly wrong for relay use.** The original post used `show ipv6 dhcp binding` and `clear ipv6 dhcp relay statistics`, which are not the right relay-focused commands in Cisco IOS/IOS-XE command references for this context. Replaced them with `show ipv6 dhcp interface`, `show ipv6 dhcp relay binding`, `debug ipv6 dhcp relay`, and `clear ipv6 dhcp relay binding *`.

7. **The router advertisement flag explanation was misleading in the example.** The original basic example configured both `managed-config-flag` and `other-config-flag` while presenting them as alternatives. Updated the example and conclusion so the M-bit is shown for stateful DHCPv6 and the O-bit is described separately for stateless DHCPv6, matching RFC 4861 behavior.

## Review Notes
- The examples now use the `2001:db8::/32` documentation prefix so they are syntactically valid without implying real production addresses.
- On IOS/IOS-XE, RFC 4861 makes the O-bit redundant when the M-bit is set; the post now treats them as separate deployment choices instead of equivalent simultaneous settings.
- On IOS/IOS-XE, Remote-ID insertion is documented for Ethernet interfaces; the post now reflects that platform-specific scope.
- IOS XR syntax and exact feature availability can vary by platform and release, but the relay profile plus `helper-address` model used in the corrected post matches Cisco’s current IOS XR documentation.
