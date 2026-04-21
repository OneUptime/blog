# Validation Summary: How to Test IPv6 Compliance of Network Equipment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 protocol compliance testing
- ICMPv6, Neighbor Discovery, Path MTU Discovery, and MLD
- IPv6 routing with OSPFv3 and BGP
- IPv6 extension headers and Routing Header Type 0 handling
- Linux networking tools: ping/ping6, iproute2, tcpdump, tracepath, ndisc6, iperf3
- Scapy packet crafting
- Cisco IOS/IOS XE and Junos operational commands
- IPv6 conformance and security test tools: UNH-IOL, ANVL/IxANVL, SI6 IPv6 Toolkit

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/info/rfc3849
- RFC 4443: ICMPv6 Specification - https://datatracker.ietf.org/doc/rfc4443/
- RFC 4861: Neighbor Discovery for IPv6 - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 5095: Deprecation of Type 0 Routing Headers in IPv6 - https://datatracker.ietf.org/doc/html/rfc5095
- RFC 8200: IPv6 Specification - https://datatracker.ietf.org/doc/rfc8200/
- RFC 8201: Path MTU Discovery for IPv6 - https://datatracker.ietf.org/doc/html/rfc8201
- RFC 8504: IPv6 Node Requirements - https://datatracker.ietf.org/doc/html/rfc8504
- Cisco IOS XE IPv6 command reference - https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/16-9/command_reference/b_169_9300_cr/ipv6_commands.pdf
- Cisco IOS IPv6 OSPF/BGP command references - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/
- Juniper Junos `show interfaces terse` reference - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-interfaces-terse.html
- iputils `ping`/`ping6` and `tracepath` manual pages - https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html and https://www.mankier.com/8/tracepath
- iproute2 `ip-neighbour` manual page - https://manpages.debian.org/experimental/iproute2/ip-neighbour.8.en.html
- ndisc6 manual page - https://www.mankier.com/8/ndisc6
- iperf3 manual page - https://manpages.debian.org/unstable/iperf3/iperf3.1.en.html
- Scapy IPv6 API documentation - https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- UNH-IOL IPv6 testing and test plans - https://www.iol.unh.edu/testing/ipv6 and https://www.iol.unh.edu/testing/ip/ipv6/test-plans
- Keysight IxANVL product documentation - https://www.keysight.com/us/en/products/ethernet-traffic-emulation/protocol-and-load-test-l2-3-emulation-software/ixanvl.html
- SI6 Networks IPv6 Toolkit manual pages - https://www.kali.org/tools/ipv6toolkit/ and https://www.mankier.com/1/ns6

## Issues Found
- Several example IPv6 addresses used non-hex labels such as `2001:db8::router`, `2001:db8::peer`, and `2001:db8::server`. Replaced them with valid RFC 3849 documentation-prefix addresses such as `2001:db8::1`, `2001:db8::2`, and `2001:db8::40`.
- The Cisco address inspection command `show ipv6 address` was not the documented IOS/IOS XE command for interface IPv6 state. Replaced it with `show ipv6 interface`.
- The Neighbor Discovery example used `arping6`, which is not the standard ndisc6 syntax and was not available locally. Replaced it with `sudo ndisc6 2001:db8::2 eth0`.
- The PMTU section implied IPv6 routers may fragment oversized packets and used an unrelated router solicitation sysctl for black-hole detection. Updated the wording to reflect that oversized packets are dropped with ICMPv6 Packet Too Big, replaced `tracepath6` with current `tracepath -6`, and changed the black-hole check to capture ICMPv6 Packet Too Big messages.
- The Routing Header Type 0 section stated RH0 must be ignored and built a Scapy packet with default/zero Segments Left. RFC 5095 requires discard plus ICMPv6 Parameter Problem when Segments Left is non-zero, so the packet now sets `segleft=1` and includes an address list.
- The MLD comment cited RFC 3810 as the source of the requirement. Updated it to RFC 8504, which states the MLDv2 support requirement for nodes that join multicast groups.
- The multicast route command was described as testing group joins. Clarified that it checks the multicast route, while `ip -6 maddr show` verifies joined multicast groups.
- Performance was described as strict IPv4/IPv6 parity and as part of mandatory RFC behavior. Changed the wording to compare IPv6 performance against IPv4 baselines and platform expectations.
- The automated tools section used `Anvil` and `tt`, and the `icmp6 --flood-nd` option was not valid for SI6 IPv6 Toolkit. Updated the conformance tool reference to ANVL/IxANVL and changed the NDP flood example to `ns6` with documented options.

## Review Notes
Scapy is not installed in this workspace, so the Scapy snippet was verified against Scapy documentation rather than executed locally. Network-device show commands and privileged packet tests were reviewed against vendor/RFC documentation but not run against physical routers or switches.
