# Validation Summary: How to Configure Zone-Based Firewall on Cisco IOS for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS Zone-Based Firewall (ZBF)
- IPv4 firewall policy configuration
- Cisco IOS class maps and policy maps
- Cisco IOS security zones and zone pairs
- Stateful inspection on Cisco routers

## Sources Consulted
- Cisco, "Zone-Based Policy Firewall [Cisco IOS 15.1S]": https://www.cisco.com/en/US/docs/ios-xml/ios/sec_data_zbf/configuration/15-1s/sec-zone-pol-fw.html
- Cisco, "Security and VPN Configuration Guide, Cisco IOS XE 17.x - Zone-Based Policy Firewalls": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/sec-vpn/b-security-vpn/m_sec-zone-pol-fw-xe.html
- Cisco, "Cisco IOS Security Command Reference: Commands S to Z - show zone security / show zone-pair security": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s6.html
- Cisco, "Cisco IOS Security Command Reference: Commands S to Z - show policy-map type inspect zone-pair / show policy-firewall session": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s5.html
- Cisco, "Understand the Zone-Based Policy Firewall Design": https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/98628-zone-design-guide.html

## Issues Found
- The `INSIDE-TO-OUTSIDE-TRAFFIC` class map matched generic `tcp` and `udp` before service-specific protocols. Cisco documents that overlapping `match protocol` statements must be ordered from more specific to less specific, or traffic is classified by the generic protocol first. I reordered the matches to `http`, `https`, `dns`, `tcp`, `udp`, `icmp`.
- The self-zone example attached an inspect policy to a zone pair with destination `self`. Cisco documents that self-zone policies are a special case and inspect policing is not supported there. I removed the invalid self-zone snippet rather than leave a broken example.
- The verification command `show policy-firewall sessions` did not match Cisco’s documented syntax for the session display used in ZBF examples. I replaced it with `show policy-map type inspect zone-pair sessions`, which is a documented ZBF session-view command.
- The introduction said all traffic between zones is denied by default. Cisco documents the self zone as the exception, so I clarified this to "user-defined zones" to keep the statement accurate.

## Review Notes
- The remaining zone, class-map, policy-map, and zone-pair configuration is technically valid for a basic IPv4 ZBF example.
- If this post is expanded later to cover traffic to or from the router itself, self-zone policy should be documented separately because it has different behavior and restrictions from ordinary interzone inspection.
- NAT, routing, and interface ACL interactions are not covered here; Cisco notes that interface ACLs on zone-member interfaces are processed before zone-pair policy.
