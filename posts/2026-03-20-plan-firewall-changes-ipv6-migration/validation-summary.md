# Validation Summary: How to Plan Firewall Rule Changes for IPv6 Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- SLAAC
- iptables/ip6tables
- nftables
- Linux network troubleshooting tools (`ip`, `curl`, `ping`, `tracepath`)

## Sources Consulted
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls": https://datatracker.ietf.org/doc/rfc4890/
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration": https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8201, "Path MTU Discovery for IP version 6": https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4193, "Unique Local IPv6 Unicast Addresses": https://www.rfc-editor.org/rfc/rfc4193
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Netfilter nftables man page: https://netfilter.org/projects/nftables/manpage.html
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ping(8)` man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` man page: https://man7.org/linux/man-pages/man8/tracepath.8.html

## Issues Found
- The Step 2 ICMPv6 example claimed to allow "all ICMPv6" for forwarded traffic but actually allowed only echo request/reply plus Packet Too Big. RFC 4890 says firewalls must not drop essential ICMPv6 error traffic such as Destination Unreachable, Packet Too Big, Time Exceeded, and Parameter Problem, so the example was updated accordingly.
- The Step 2 SLAAC example treated inbound Router Solicitations as a generic host requirement. RFC 4862 and RFC 4861 make the normal host behavior the opposite direction: hosts receive Router Advertisements and send Router Solicitations. The rules were corrected and router-specific cases were explicitly separated.
- The Step 2 MLD guidance treated MLD as universally mandatory and only showed inbound rules. RFC 4890 describes MLD as link-local multicast control traffic that is only needed when multicast is in use, with direction depending on whether the node is a host or multicast router. The text and rules were corrected to reflect that.
- The Step 3 example used `-m state --state`, which is an older subset of the conntrack matcher. The post now uses `-m conntrack --ctstate`, matching current documentation.
- The Step 3 management prefix `2001:db8:mgmt::/48` was invalid IPv6 syntax. It was replaced with the valid documentation prefix `2001:db8:100::/48`.
- The Step 3 martian-source drops were placed after a blanket `ACCEPT` for all ICMPv6, which would let spoofed ICMPv6 traffic bypass the drop rules. The drop rules were moved before the broad ICMPv6 allow, and the incorrect `2002::/16` martian example was removed because 6to4 space is not categorically invalid on the Internet.
- The IPv4/IPv6 comparison table overstated two points: that ULA directly replaces RFC 1918 space, and that NAT is simply "not applicable" to IPv6. The table was corrected to describe ULA as the closest analogue and NAT66/NPTv6 as uncommon exceptions.
- The validation commands used legacy `ping6`/`tracepath6` forms and overstated what an empty neighbor table means. They were updated to `ping -6` and `tracepath -6`, and the NDP note now points to persistent `INCOMPLETE` or `FAILED` neighbor entries instead.
- The nftables example omitted essential ICMPv6 error types and `mld-listener-done`. The rule set was updated to match the corrected ICMPv6 guidance.
- The conclusion incorrectly said IPv6 has no NAT so all addresses are routable. It now states the technically correct point that IPv6 usually avoids NAT at the perimeter and that global unicast reachability is controlled by filtering.

## Review Notes
- The post is technically relevant and contains real command/configuration content, so it was reviewed as a technical guide rather than marked `not-code-blog`.
- `ip6tables -p ipv6-icmp -h` was used locally to confirm current ICMPv6 type names supported by `ip6tables` in this environment.
- `nft --check` and `ip6tables-restore --test` could not be fully executed in this environment because both attempted privileged netfilter operations, so nftables and ip6tables syntax was cross-checked against the official Netfilter and Linux man-page documentation instead.
