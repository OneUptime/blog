# Validation Summary: How to Configure IPv6 QoS Policies on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS MQC
- IPv6
- QoS
- DSCP / DiffServ
- LLQ / CBWFQ
- NBAR protocol matching

## Sources Consulted
- Cisco QoS: Classification Configuration Guide, Cisco IOS XE Gibraltar 16.12.x, "IPv6 Quality of Service" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_classn/configuration/xe-16-12/qos-classn-xe-16-12-book/ip6-qos-xe.html
- Cisco QoS Modular QoS Command-Line Interface Configuration Guide, Cisco IOS Release 15S, "Applying QoS Features Using the MQC" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_mqc/configuration/15-s/qos-mqc-15-s-book/qos-mqc.html
- Cisco QoS: Policing and Shaping Configuration Guide, Cisco IOS Release 12.4T, "QoS Percentage-Based Policing" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_plcshp/configuration/12-4t/qos-plcshp-12-4t-book/qos-plcshp-pct-plc.html
- Cisco QoS: Congestion Management Configuration Guide, Cisco IOS XE 17, "Congestion Management Overview" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/xe-17/qos-conmgt-xe-17-book/qos-conmgt-oview.html
- Cisco IOS Quality of Service Solutions Command Reference, "match access-group through mls ip pbr" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos/command/qos-cr-book/qos-m1.html
- Cisco IOS Quality of Service Solutions Command Reference, "show mls qos through wrr-queue threshold" - https://www.cisco.com/c/en/us/td/docs/ios/qos/command/reference/qos_book/qos_s4.html
- Cisco IOS IPv6 Command Reference, "IPv6 Commands: show ipv6 ri to si" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html
- Cisco IOS IPv6 Command Reference, "debug ipv6 pim df-election through ip http server" - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_04.html
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" - https://datatracker.ietf.org/doc/html/rfc2474

## Issues Found
- The policing syntax used `police rate percent 30`, but Cisco documents percentage-based policing as `police cir percent ...`. I changed it to `police cir percent 20`.
- The WAN policy allocated 100% of interface bandwidth across `priority percent` and `bandwidth percent` classes. Cisco documents a default 75% maximum reserved bandwidth, so I reduced the example percentages to fit within that default limit.
- The sample IPv6 addresses `2001:db8:lan::1/64`, `2001:db8:wan::1/64`, and `2001:db8:serial::1/64` were invalid because `lan`, `wan`, and `serial` are not hexadecimal hextets. I replaced them with valid documentation-prefix addresses.
- The class-map used `match protocol icmpv6`, but Cisco documents the NBAR protocol keyword as `ipv6-icmp`. I corrected the keyword.
- The monitoring example used `debug ipv6 policy`, which is for IPv6 policy-based routing, not QoS verification. I replaced it with `show policy-map interface` on the ingress remarking interface.
- The monitoring example used `show policy-map interface ... output class ...`, which is not the documented QoS interface command syntax for this use case. I replaced it with the documented `show policy-map ... class ...` form.
- The monitoring example used `show ipv6 traffic | include DSCP`, but `show ipv6 traffic` reports IPv6 protocol counters and does not expose DSCP statistics in the documented output. I changed it to plain `show ipv6 traffic`.
- The LLQ example labeled the link as a T1 but configured 5 Mbps priority and 10 Mbps guaranteed bandwidth, which is not realistic for a 1.544 Mbps T1. I reduced the values to T1-appropriate rates.
- The closing explanation referred to the IPv4 ToS field. RFC 2474 defines DSCP behavior in the IPv4 and IPv6 DS field / Traffic Class context, so I updated the wording for accuracy.

## Review Notes
- Cisco notes that `match protocol` availability can vary by platform and release. Readers using a specific router or IOS train should confirm supported protocol keywords with CLI help and Cisco Feature Navigator.
