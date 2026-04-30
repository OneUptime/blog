# Validation Summary: Why You Must Not Block ICMPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- Path MTU Discovery (PMTUD)
- Multicast Listener Discovery (MLD)
- DHCPv6
- Linux `ip6tables`

## Sources Consulted
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls" - https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 8201, "Path MTU Discovery for IP version 6" - https://www.rfc-editor.org/rfc/rfc8201
- RFC 3810, "Multicast Listener Discovery Version 2 (MLDv2) for IPv6" - https://www.rfc-editor.org/rfc/rfc3810
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4821, "Packetization Layer Path MTU Discovery" - https://www.rfc-editor.org/rfc/rfc4821
- Local `ip6tables` documentation: `ip6tables -p icmpv6 -h` and `man ip6tables` on `ip6tables v1.8.10 (nf_tables)`

## Issues Found
- The post said types `133-137` were used for router discovery, address resolution, and DAD. I corrected that to `133-136` because Redirect is type `137`, while the listed functions are carried by RS/RA/NS/NA.
- The post said blocking Router Solicitation (type `133`) means hosts cannot get addresses. I corrected this to "delayed or broken RA discovery" because RFC 4861 routers also send periodic unsolicited Router Advertisements.
- The PMTUD section said that without ICMPv6 Packet Too Big, all packets use the local interface MTU. I corrected this to say sources keep using the first-hop MTU, which matches RFC 8201's PMTUD behavior.
- The message-type table treated Packet Too Big black holes as absolute and described PMTUD too generally. I narrowed this to "classical PMTUD" and changed "always" style wording to "often" to avoid overstating behavior in environments that implement PLPMTUD.
- The Echo Request/Echo Reply section labeled types `128` and `129` as simply optional. I corrected that to a policy-dependent/useful category and noted that RFC 4890 recommends allowing them.
- The MLD wording implied that blocking MLD means all IPv6 multicast stops working in every case. I softened this to say multicast listener management breaks and multicast delivery may fail, which is the behavior supported by RFC 3810.
- The `ip6tables` example was presented as a general firewall policy but only had one `FORWARD` rule and therefore was not a full forwarding-firewall policy. I corrected the section to scope it as a host policy and noted that forwarding firewalls need additional `FORWARD` rules per RFC 4890.
- The `ping6` rules were functionally incomplete. The original example allowed inbound Echo Requests and outbound Echo Replies, but not outbound Echo Requests or inbound Echo Replies, so the host could be pinged but could not successfully `ping6` out. I added the missing type `128` OUTPUT and type `129` INPUT rules.
- The IPv4/IPv6 comparison overstated fragmentation behavior. I corrected IPv4 to say routers can fragment when DF is clear, and IPv6 to say routers do not fragment in transit and blocking type `2` breaks classical PMTUD and often creates PMTU black holes.

## Review Notes
- The post is now technically accurate as a minimum host-focused ICMPv6 firewall guide. Forwarding routers and transit firewalls still need broader ICMPv6 transit allowances as described in RFC 4890.
