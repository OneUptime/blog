# Validation Summary: How to Configure GRE Tunnel on a Cisco Router with IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cisco IOS
- GRE tunnels
- IPv4 routing
- Static routing
- OSPF
- IPsec

## Sources Consulted
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- Cisco, Understand GRE Tunnel Keepalives: https://www.cisco.com/c/en/us/support/docs/ip/generic-routing-encapsulation-gre/118370-technote-gre-00.html
- Cisco, How GRE Keepalives Work: https://www.cisco.com/c/en/us/support/docs/ip/generic-routing-encapsulation-gre/63760-gre-keepalives-63760.html
- Cisco, Tunnel Interface Command Reference (`tunnel source`, `tunnel destination`, `tunnel mode`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/command/ir-xe-3se-3850-cr-book/tunnel_destination_through_tunnel_source.html
- Cisco, `show ip interface` Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/command/ir-cr-book/ir-s5.html
- Cisco, Understand the Ping and Traceroute Commands: https://www.cisco.com/c/en/us/support/docs/ios-nx-os-software/ios-software-releases-121-mainline/12778-ping-traceroute.html
- Cisco, `ping ip` Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/cf_command_ref/monitor_event-trace_through_Q.html
- Cisco, `ip tcp adjust-mss` Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp/command/iap-cr-book/iap-i2.html
- Cisco, Configuring IPSec with EIGRP and IPX Using GRE Tunneling: https://www.cisco.com/c/en/us/support/docs/security-vpn/ipsec-negotiation-ike-protocols/14136-ipsec-gre.html
- Cisco, GRE over IPsec (IOS XE guide): https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr3-fwd/gre/gre-configuration-guide/m-gre-over-ipsec.html

## Issues Found
- The topology used `10.0.0.1` and `10.0.0.2` as the WAN/public endpoints, but the actual GRE configuration used `203.0.113.1` and `203.0.113.2`. I updated the topology so it matches the configuration and uses the same documented tunnel endpoints.
- The OSPF section only showed one router, which was incomplete for a GRE tunnel example. I expanded it to show both Router A and Router B so the example is deployable as written.
- The verification command `show ip interface brief Tunnel0` used the wrong IOS argument order. I corrected it to `show ip interface tunnel 0 brief` based on Cisco command syntax.
- The tunnel ping example was tightened to the documented IOS form `ping ip ... source tunnel 0`.
- The GRE-over-IPsec section only showed one side of the VPN and omitted transport mode on the transform set. I added the reciprocal peer configuration and `mode transport`, which matches Cisco's GRE-over-IPsec guidance for protecting GRE traffic with crypto maps.
- The conclusion said to adjust MTU to `1400` as a blanket rule. I changed that wording to "adjust MTU/MSS as needed" because the exact value depends on encapsulation overhead and path MTU.

## Review Notes
- The post is technically valid after the fixes above.
- The `keepalive 10 3` syntax is valid for point-to-point GRE tunnels, and Cisco documents that GRE keepalives are supported only on point-to-point GRE.
- The IPsec example remains based on IKEv1 (`crypto isakmp`), which is still a valid Cisco IOS configuration pattern. However, newer Cisco IOS XE GRE-over-IPsec guides commonly show IKEv2 with IPsec profiles and tunnel protection, so that would be a reasonable future refresh.
