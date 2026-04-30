# Validation Summary: How to Interpret ICMP Destination Unreachable Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- IPv4
- Linux networking tools
- `tcpdump`
- `netcat`
- `iproute2`
- `arp`
- `iptables`
- `traceroute`

## Sources Consulted
- RFC 792, "Internet Control Message Protocol" - https://www.rfc-editor.org/rfc/rfc792
- RFC 1122, "Requirements for Internet Hosts -- Communication Layers" - https://www.rfc-editor.org/rfc/rfc1122
- RFC 1812, "Requirements for IP Version 4 Routers" - https://www.rfc-editor.org/rfc/rfc1812
- RFC 1191, "Path MTU Discovery" - https://www.rfc-editor.org/rfc/rfc1191
- Netfilter `REJECT` target documentation - https://git.netfilter.org/iptables/tree/extensions/libipt_REJECT.man?id=aeafdb8126d6ee658ff2b55dea380a84d1d77a25
- Traceroute for Linux project page - https://traceroute.sourceforge.net/
- Local CLI documentation checked with `tcpdump --help`, `tcpdump(8)`, `pcap-filter(7)`, `ip route help`, `arp -h`, `nc -h`, `ping -h`, and `iptables -j REJECT -h`

## Issues Found
- The Code 13 table entry said "Firewall DROP with ICMP". That was technically wrong because `DROP` does not send an ICMP error. I changed it to describe administrative filtering that blocks traffic and corrected the sender to "Router or firewall".
- The UDP example used `nc -u 10.20.0.5 12345`, which does not reliably send a probe by itself. I changed it to `nc -u -z -w1 10.20.0.5 12345` so it actively triggers the closed-port behavior being described.
- The testing example claimed it generated Code 13 while using `--reject-with icmp-host-prohibited`. I changed it to `--reject-with icmp-admin-prohibited` and updated the note so the example now matches Type 3 Code 13.

## Review Notes
- Codes 9 and 10 are valid ICMP Destination Unreachable codes and Linux can emit them, but RFC 1812 recommends that routers use Code 13 for administrative filtering.
