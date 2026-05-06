# Validation Summary: How to Troubleshoot BGP IPv6 Peering Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP-4
- Multiprotocol BGP for IPv6
- FRRouting
- Cisco IOS BGP CLI
- Linux networking tools (`nc`, `ss`, `ip`, `ping6`, `traceroute6`)
- `ip6tables`
- `tcpdump`
- `tshark`

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS IPv6 Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- RFC 4271, BGP-4: https://www.rfc-editor.org/rfc/rfc4271
- RFC 4760, Multiprotocol Extensions for BGP-4: https://www.rfc-editor.org/rfc/rfc4760.html
- RFC 2385, TCP MD5 Signature Option for BGP sessions: https://www.rfc-editor.org/rfc/rfc2385
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html
- IANA Service Name and Port Number Registry for BGP port 179: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=179
- Wireshark `tshark` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Local CLI help/man pages used to verify command syntax and filter behavior: `ss --help`, `ip route help`, `ping -h`, `nc -h`, `tcpdump --help`, `man pcap-filter`, `grep --help`

## Issues Found
- The example peer address `2001:db8:peer::2` was not a valid IPv6 literal. I replaced it with the valid documentation address `2001:db8::2` throughout the post.
- The `nc` exit-code note said any non-zero result meant the port was blocked. I corrected that to say a non-zero result means the TCP connect failed, which is more accurate for timeouts, routing failures, and refusals.
- The address-family section made an overly strong inference about missing IPv6 route exchange. I rewrote it to tell readers to confirm IPv6 unicast negotiation/activation and then check policy/filtering or lack of advertised prefixes, which is more accurate for MP-BGP behavior.
- The MD5 troubleshooting text said TCP would fail silently and suggested looking only for RSTs. I updated it to match RFC 2385, which notes that connection attempts may time out instead of being cleanly refused, and changed the capture command to observe the full TCP 179 exchange.
- The `grep` expression for `OPEN\|NOTIFICATION` depended on a less portable regular-expression form. I changed it to `grep -E "OPEN|NOTIFICATION"`.
- The table entry for routes received but not installed listed firewall/RPF as the cause. I corrected it to the more directly relevant causes of next-hop unreachability or RIB failure.

## Review Notes
- The post is Linux-oriented. On some systems, operators may prefer `ping -6` and `traceroute -6`, and `traceroute6` may not be installed by default.
- The firewall examples use `ip6tables`, which remains common, but nftables-native environments may use `nft` instead.
