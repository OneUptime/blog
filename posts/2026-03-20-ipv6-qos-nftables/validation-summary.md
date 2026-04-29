# Validation Summary: How to Configure IPv6 QoS with nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- IPv6
- DSCP / DiffServ
- Linux firewalling
- Connection tracking
- systemd

## Sources Consulted
- nftables man page: https://www.netfilter.org/projects/nftables/manpage.html
- nftables wiki, Matching packet headers: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables wiki, Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki, Maps: https://wiki.nftables.org/wiki-nftables/index.php/Maps
- nftables wiki, Counters: https://wiki.nftables.org/wiki-nftables/index.php/Counters
- nftables wiki, Setting packet metainformation: https://wiki.nftables.org/wiki-nftables/index.php/Setting_packet_metainformation
- RFC 2474, Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers: https://datatracker.ietf.org/doc/html/rfc2474
- RFC 4594, Configuration Guidelines for DiffServ Service Classes: https://datatracker.ietf.org/doc/rfc4594/
- Local `nft` CLI references: `nft --help`, `nft describe ip6 dscp`, `nft describe icmpv6 type`, `nft describe meta l4proto`

## Issues Found
- Several IPv6 examples used invalid placeholder literals such as `2001:db8:internal::/48`, `2001:db8:voip::/64`, and `2001:db8::client`. These were replaced with syntactically valid documentation-prefix IPv6 addresses and subnets.
- The DSCP class choices in the main example did not line up with the RFC 4594 service-class guidance. Video streaming was changed from `AF41` to `AF31`, interactive SSH from `AF31` to `AF21`, DNS from `CS6` to `CS0`, and low-priority server-farm traffic from `AF21` to `CS1`.
- The ICMPv6 example used `ip6 nexthdr icmpv6` and marked all ICMPv6 as `CS7`. That was corrected to match specific ICMPv6 Neighbor Discovery and Router Advertisement message types and mark them as `CS6`, which is the RFC 4594 network-control class and avoids the IPv6 extension-header caveat of `ip6 nexthdr`.
- The conntrack section incorrectly implied that marking SIP signaling on port 5060 would reliably classify all related VoIP packets as EF. It also overwrote the signaling class with EF. This was replaced with a valid same-connection conntrack example that stores and reapplies DSCP for SSH and RTP flows.
- The monitoring section used `nft replace rule` without the required rule `handle`, and the `add chain` shell command was missing quoting around braces and semicolons. Those commands were corrected, and the trace example now uses a valid IPv6 address and `head -n 50`.

## Review Notes
- The post is technically focused on DSCP marking and classification. End-to-end QoS behavior still depends on downstream queueing/shaping policy honoring those markings.
- The `th dport` transport-header expression requires sufficiently recent nftables/kernel support; the nftables wiki notes it is available with nftables 0.9.2 and Linux kernel 5.3 or newer.
