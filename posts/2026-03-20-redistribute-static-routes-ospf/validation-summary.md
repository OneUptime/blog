# Validation Summary: How to Redistribute Static Routes into OSPF

## Status
validated

## Post Type
Guide

## Technologies Covered
- OSPFv2
- Static routing
- Cisco IOS routing
- Route maps and prefix lists
- Connected-route redistribution

## Sources Consulted
- Cisco IOS IP Routing: OSPF Command Reference, `default-information originate (OSPF)`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-a1.html
- Cisco IOS IP Routing Protocol-Independent Command Reference, `redistribute (IP)` and `match ip address`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_A_through_R.html
- Cisco IOS IP Routing: OSPF Command Reference, `network area`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/m_ospf-i1.html
- Cisco IOS IP Routing: OSPF Command Reference, `show ip ospf database`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/m_ospf-s1.html
- Cisco, How Does OSPF Generate Default Routes?: https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13692-21.html
- Cisco, Redistributing Connected Networks into OSPF: https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/18722-redist-conn.html
- Cisco, Configure Routing Protocol Redistribution: https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/8606-redist.html
- RFC 2328, OSPF Version 2: https://datatracker.ietf.org/doc/rfc2328/
- RFC 3101, The OSPF Not-So-Stubby Area (NSSA) Option: https://datatracker.ietf.org/doc/html/rfc3101

## Issues Found
- The post said `redistribute static subnets` redistributed all static routes. I corrected this because Cisco IOS does not inject the default route with `redistribute static`; `default-information originate` is required for `0.0.0.0/0`.
- Several redistribution examples used `subnets` before `metric`. I changed them to the documented Cisco IOS form (`metric ... subnets`) so the example commands match official syntax.
- The selective redistribution examples were adjusted to use documented Cisco IOS keyword ordering with `route-map` and `subnets`.
- The connected-redistribution section referred to redistributing "interfaces." I corrected that to connected networks, which is what OSPF redistribution actually advertises.
- The verification wording implied `show ip ospf database external` was universal. I narrowed it to normal areas because NSSA redistribution uses Type-7 LSAs instead of Type-5 within the NSSA.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The guidance is Cisco IOS/IOS XE oriented; behavior and CLI syntax can differ on other Cisco platforms such as NX-OS and ASA.
- External LSAs are not flooded into stub areas, and redistributed routes appear as Type-7 LSAs inside NSSAs.
