# Validation Summary: How to Verify NAT Translations on a Cisco Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IPv4 Network Address Translation (NAT/PAT)
- Cisco router troubleshooting and verification commands
- Access control lists (ACLs)
- Cisco Express Forwarding (CEF)

## Sources Consulted
- Cisco IOS IP Addressing Services Command Reference: `show ip nat translations`, `show ip nat statistics`, and `clear ip nat translation`  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-cr-book_chapter_01000.html  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i4.html  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book.pdf
- Cisco IOS Debug Command Reference: `debug ip nat` syntax and filtering options  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-i1-cr-book/db-i2.html
- Cisco NAT Configuration Guide: monitoring, maintaining, and clearing NAT translations  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/xe-3s/nat-xe-3s-book/iadnat-monmain.html  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/12-4/nat-12-4-book/iadnat-monmain.html
- Cisco IOS IP Routing Protocol-Independent Command Reference: `show ip route` syntax  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_S_through_T.html
- Cisco support FAQ on NAT behavior and forwarding paths  
  https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/218012-troubleshoot-network-address-translation.pdf

## Issues Found
- The post used `debug ip nat 10.1.0.10` as a host-specific filter. Cisco documents `debug ip nat` filtering by standard ACL, not by direct IP argument. I changed this to `access-list 10 permit host 10.1.0.10` followed by `debug ip nat 10`.
- The post used invalid syntax for clearing a specific NAT translation: `clear ip nat translation inside 10.1.0.10 outside 8.8.8.8`. Cisco’s command reference requires inside global/local pairs, outside local/global pairs, or the full protocol form. I replaced it with a valid inside translation example: `clear ip nat translation inside 203.0.113.2 10.1.0.10 forced`.
- The protocol-specific clear example was incomplete. Cisco requires both inside and outside address/port tuples for `tcp` and `udp` clears. I replaced it with a valid full example: `clear ip nat translation tcp inside 203.0.113.2 1024 10.1.0.10 45678 outside 8.8.8.8 53 8.8.8.8 53`.
- The checklist stated that CEF was “required for hardware-assisted NAT.” Cisco documentation shows IOS NAT supports CEF, and historically also fast/process switching depending on platform and release. I narrowed the wording so it no longer overstates CEF as a hard requirement for NAT operation.
- The default-route verification command was changed from `show ip route 0.0.0.0` to `show ip route 0.0.0.0 0.0.0.0` to make the lookup explicitly target the default route.

## Review Notes
- The post is technically relevant and salvageable; it remains a valid Cisco troubleshooting guide after the command-syntax fixes above.
- `show ip nat statistics` output varies by platform and release. Counters such as CEF-translated packets and drop fields may appear differently across IOS and IOS XE trains.
- `clear ip nat translation` clears dynamic translation entries from the table. Static NAT configuration remains configured unless the static rule itself is removed from running configuration.
