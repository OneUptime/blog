# Validation Summary: How to Send Gratuitous NDP in IPv6

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 Neighbor Advertisement
- Linux neighbor table management with `ip`
- Packet capture and filtering with `tcpdump` / libpcap syntax
- Scapy packet crafting for IPv6
- Keepalived VRRP for IPv6 high availability

## Sources Consulted
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://www.rfc-editor.org/rfc/rfc4861
- Scapy IPv6 API reference (`scapy.layers.inet6`): https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Keepalived configuration manual: https://www.keepalived.org/manpage.html
- `ip-neighbour(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `pcap-filter(7)` Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `arping(8)` iputils manual page: https://manpages.debian.org/trixie/iputils-arping/arping.8.en.html
- `ndsend(8)` manual page: https://manpages.debian.org/testing/vzctl/ndsend.8.en.html
- `ndisc6` package contents index: https://manpages.debian.org/testing/ndisc6/index.html
- Local command verification with `tcpdump -d`, `ip -6 neigh help`, and Scapy packet construction

## Issues Found
- The post claimed `ndsend` came from the `ndisc6` package and provided an `arping6` workflow. I corrected this because `arping` is IPv4-only, there is no valid `arping6` command in iputils, and `ndsend` is not part of the `ndisc6` package listing consulted.
- The VRRP examples used `2001:db8::vip`, which is not a valid IPv6 literal. I replaced it with the valid documentation address `2001:db8::100`.
- The Scapy and shell examples used 100 ms spacing and the conclusion recommended 100 ms bursts. I corrected the examples and explanation to match RFC 4861, which allows up to 3 unsolicited Neighbor Advertisements separated by at least `RetransTimer`.
- The keepalived comment said IPv6 unsolicited NAs were sent "via libipv6". I removed that unsupported implementation claim and kept the accurate statement that keepalived automatically sends unsolicited NAs on failover.
- The neighbor-cache management section implied remote cache updates, but the `ip -6 neigh` commands only manage the local kernel neighbor table. I corrected the heading and comments, and fixed the inaccurate note that `ip -6 neigh flush ... nud reachable` would set entries to `STALE`; it flushes matching entries instead.
- The `tcpdump` filter used `ip6[48:16]`, which is invalid libpcap syntax because packet data accessor sizes are limited to 1, 2, or 4 bytes. I replaced it with a valid Neighbor Advertisement filter.
- The verification output described a source link-layer option and a `REACHABLE` state. For Neighbor Advertisements the relevant option is the Target Link-Layer Address option (type 2), and unsolicited NAs that update the mapping typically leave the entry in `STALE`, per RFC 4861 processing rules.

## Review Notes
- Keepalived exposes NA repeat and interval tuning (`vrrp_gna_interval` / `garp_group`) that can differ from the generic RFC 4861 timing guidance used in the post's manual examples.
- Scapy's `ICMPv6NDOptDstLLAddr` class name is counterintuitive, but its documentation explicitly uses it for the Target Link-Layer Address option in Neighbor Advertisements.
