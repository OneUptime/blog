# Validation Summary: How to Configure DHCP on a Cisco Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- DHCP server configuration
- DHCP relay (`ip helper-address`)
- DHCP options
- Router and VLAN interface configuration

## Sources Consulted
- Cisco IOS XE 17.x IP Addressing Configuration Guide, "Configuring the Cisco IOS XE DHCP Server" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_config-dhcp-server-xe.html
- Cisco IOS XE DHCP Server PDF guide, including DHCP pool, lease, option, and manual binding syntax - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/xe-16-9/dhcp-xe-16-9-book/config-dhcp-server-xe.pdf
- Cisco IP Addressing Services Command Reference, `ip dhcp excluded-address` - https://www.cisco.com/c/en/us/td/docs/ios/ipaddr/command/reference/ipaddr-xe-3se-3850-cr-book/ipaddr-xe-3se-3850-cr-book_chapter_01.html
- Cisco support documentation, "Configuring the Cisco IOS DHCP Relay Agent" - https://www.cisco.com/en/US/docs/ios/12_4t/ip_addr/configuration/guide/htdhcpre.html
- Cisco support article, "Configure and Troubleshoot a DHCP Server on Cisco IOS XE SDWAN Router" - https://www.cisco.com/c/en/us/support/docs/routers/sd-wan/221087-configure-and-troubleshoot-a-dhcp-server.html
- RFC 2132, "DHCP Options and BOOTP Vendor Extensions" - https://www.rfc-editor.org/rfc/rfc2132.html

## Issues Found
- The static reservation example implied that matching only on a raw MAC address is the general Cisco IOS approach. Cisco documents that many DHCP clients send option 61 and should be matched with `client-identifier`, while `hardware-address` is for clients that do not send a client identifier. I updated the example to use `client-identifier 01aa.aabb.bbcc.cc`.
- The post described `show ip dhcp binding` too narrowly as active leases with MAC and IP. Cisco documents this command as showing bindings created on the DHCP server, so I narrowed the wording to "current DHCP bindings and assigned IPs."
- The final takeaway overstated DHCP option support and used simplified syntax. Cisco documents the pool command as `option code [instance] {ascii | hex | ip-address}`, so I corrected the syntax and changed the claim to "custom DHCP options."

## Review Notes
- The remaining DHCP pool examples are consistent with Cisco IOS / IOS XE syntax for `ip dhcp pool`, `network`, `default-router`, `dns-server`, `domain-name`, and `lease`.
- The relay example is technically correct for DHCP forwarding. On Cisco IOS, `ip helper-address` forwards additional UDP broadcast services by default as well, but the post's DHCP-focused explanation is still valid.
