# Validation Summary: How to Troubleshoot IPv4 Routing Loops

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- IPv4 TTL and ICMP Time Exceeded
- traceroute, Windows tracert, mtr, and Paris traceroute
- Cisco IOS static routing, administrative distance, and Null0 routes
- FRRouting/Quagga vtysh route inspection
- OSPF summarization and discard routes
- BGP AS-path loop prevention, allowas-in, and route reflection
- tcpdump/pcap filters
- Linux iproute2 blackhole routes

## Sources Consulted
- RFC 791: Internet Protocol - https://www.rfc-editor.org/rfc/rfc791.html
- RFC 792: Internet Control Message Protocol - https://www.rfc-editor.org/rfc/rfc792.html
- RFC 2328: OSPF Version 2 - https://www.rfc-editor.org/rfc/rfc2328.html
- RFC 4271: BGP-4 - https://www.rfc-editor.org/rfc/rfc4271.html
- RFC 4456: BGP Route Reflection - https://www.rfc-editor.org/rfc/rfc4456.html
- Cisco IOS IP Routing Protocol-Independent Command Reference - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_A_through_R.html
- Cisco IOS show ip route command reference - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/iri-cr-book/iri-cr-s1.html
- Cisco Null0 loop-prevention guidance - https://www.cisco.com/c/en/us/support/docs/ip/ip-routed-protocols/14956-route-to-null-interface.html
- Cisco BGP route-reflector and BGP regular-expression documentation - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-2/irg-xe-2-book/irg-int-features.html and https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13754-26.html
- Cisco allowas-in documentation - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/112236-allowas-in-bgp-config-example.html
- FRRouting Zebra documentation and command source - https://docs.frrouting.org/en/latest/zebra.html and https://github.com/FRRouting/frr/blob/master/zebra/zebra_vty.c
- Microsoft tracert documentation - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- Linux man-pages for traceroute, ip-route, and pcap-filter - https://www.man7.org/linux/man-pages/man8/traceroute.8.html, https://man7.org/linux/man-pages/man8/ip-route.8.html, and https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- mtr project man page - https://github.com/traviscross/mtr/blob/master/man/mtr.8.in
- Paris traceroute man page - https://manpages.debian.org/testing/paris-traceroute/paris-traceroute.1.en.html
- GitHub author profile link - https://github.com/nawazdhandala

## Issues Found
- The post stated that the sender receives ICMP Time Exceeded when TTL reaches zero. RFC 792 says the gateway may notify the source, so the wording now says the source may receive the message.
- The traceroute example treated repeating hops as definitive. This was softened to "usually indicates" because ECMP/load balancing can create traceroute artifacts.
- The mtr comment said `mtr --report` gives a real-time view. `--report` is report mode, so the comment now says it prints a summary.
- The Cisco `show ip route` example omitted the subnet mask for checking an exact prefix. It now uses `show ip route 10.20.30.0 255.255.255.0`.
- The FRR/Quagga `longer-prefixes` command had the keyword before the prefix. It now uses `show ip route 10.20.30.0/24 longer-prefixes`.
- The OSPF cause "two routers advertise the same prefix to each other" was too imprecise for a link-state protocol. It now refers to mutual redistribution or summarization feeding a prefix back toward its origin.
- The BGP AS-path check looked for the local ASN twice, but one local-AS occurrence is enough for AS-path loop prevention. It now uses an AS-path regexp and describes any occurrence of the local ASN.
- The BGP route-reflector text now names ORIGINATOR_ID and CLUSTER_LIST, which are the route-reflection loop-prevention attributes.
- The static-route fix overgeneralized that only one router should have a default route. It now says not to point two defaults at each other and to use a learned default or real upstream next hop.
- The Null0 floating static example said administrative distance 254 was lower than OSPF. Cisco administrative distance 254 is higher and less preferred, so the comment was corrected.
- The tcpdump command piped to grep without line buffering. It now uses `tcpdump -l`.
- The conclusion used an incomplete Cisco Null0 placeholder command. It now includes the required mask placeholder.

## Review Notes
The technical content is now accurate as a general IPv4 routing-loop troubleshooting guide. Some commands are platform/version dependent, especially Cisco IOS versus IOS XE syntax and FRR/Quagga command availability, but the examples use valid current forms for the referenced platforms.
