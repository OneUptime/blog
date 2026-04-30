# Validation Summary: How to Implement IPv6 Egress Filtering

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- nftables
- iptables / ip6tables
- Cisco IOS IPv6 ACLs
- Junos firewall filters
- tcpdump

## Sources Consulted
- RFC 2827 / BCP 38: https://datatracker.ietf.org/doc/rfc2827/
- RFC 3849 (IPv6 documentation prefix): https://datatracker.ietf.org/doc/rfc3849/
- RFC 6666 (IPv6 discard prefix): https://datatracker.ietf.org/doc/html/rfc6666
- RFC 7526 (6to4 relay anycast deprecation): https://datatracker.ietf.org/doc/html/rfc7526
- RFC 4380 (Teredo / UDP 3544): https://datatracker.ietf.org/doc/rfc4380/
- RFC 5095 (deprecation of IPv6 Routing Header Type 0): https://datatracker.ietf.org/doc/html/rfc5095
- nftables wiki, Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- Cisco IOS IPv6 ACL documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_data_acl/configuration/15-sy/sec-data-acl-15-sy-book/ip6-acls.html
- Juniper firewall filter guidelines: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-stateless-guidelines-for-configuring.html
- Juniper IPv6 firewall filter match conditions: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Local command help checked for syntax: `ip6tables -m rt -h`, `ip6tables -j LOG -h`, `ip6tables -m limit -h`, `tcpdump -d`

## Issues Found
- The overview described BCP 38 as preventing spoofed traffic from entering. RFC 2827 describes ingress filtering at the network edge to prevent spoofed source addresses from being propagated. The explanation was corrected.
- Several example IPv6 literals were syntactically invalid, including `2001:db8:corp::/48`, `2001:db8::dns1`, and `2001:db8::dns2`. These were replaced with valid RFC 3849 documentation addresses.
- The `nft add chain` example used unquoted shell metacharacters. The command was updated to the documented quoted form so it is shell-safe.
- The Linux anti-spoofing example omitted `::/128`, which is used as a source address during Duplicate Address Detection and some Router Solicitations. An explicit allow for `::/128` was added.
- The DNS egress example allowed TCP/53 only to the first resolver. A matching allow for the second resolver was added.
- The Cisco example used `ipv6 access-group` on the interface. Cisco documents IPv6 interface ACL application with `ipv6 traffic-filter`, so the command was corrected.
- The Cisco ACL ended with an explicit `deny ipv6 any any log` without preserving Neighbor Discovery traffic that would otherwise be covered by implicit rules. Explicit `nd-ns` and `nd-na` permits were added before the deny.
- The Juniper filter accepted the corporate prefix but then allowed all other global unicast sources with `allow-rest then accept`, which defeated anti-spoofing. It was changed to permit the intended source prefix, allow Neighbor Discovery, and reject other sources.
- The monitoring section claimed to log egress drops, but the original `LOG` rules would only log packets reaching those rules. It was replaced with a reusable rate-limited `EGRESS-LOG-DROP` chain intended to be used as the target for deny rules.

## Review Notes
- The examples intentionally use RFC 3849 documentation prefixes. Replace them with real assigned prefixes and resolver addresses before production use.
- Real internet-facing interfaces may require additional explicit permits for control-plane traffic such as Router Solicitation/Advertisement, DHCPv6, or routing protocols, depending on how the uplink is provisioned.
