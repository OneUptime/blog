# Validation Summary: How to Diagnose MTU Black Hole Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Path MTU Discovery (PMTUD)
- IPv4 ICMP Destination Unreachable / Fragmentation Needed
- Linux `ping`
- Linux `tracepath`
- Linux `traceroute`
- `tcpdump` / libpcap capture filters
- Linux `iptables` / `TCPMSS`
- Linux IP socket PMTU settings

## Sources Consulted
- RFC 1191: Path MTU Discovery — https://www.rfc-editor.org/rfc/rfc1191.html
- RFC 2923: TCP Problems with Path MTU Discovery — https://www.rfc-editor.org/rfc/rfc2923
- `ping(8)` man page (iputils) — https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` man page (iputils) — https://man7.org/linux/man-pages/man8/tracepath.8.html
- `traceroute(8)` man page — https://man7.org/linux/man-pages/man8/traceroute.8.html
- `iptables-extensions(8)` man page (`TCPMSS`) — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ip(7)` man page (`IP_MTU_DISCOVER`, `IP_PMTUDISC_DONT`) — https://man7.org/linux/man-pages/man7/ip.7.html
- `tcpdump(8)` man page — https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `pcap-filter(7)` man page — https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The introduction defined an MTU black hole too narrowly as a router failing to send ICMP. RFC 2923 is broader: the failure occurs when the needed ICMP message does not reach the sender. I corrected the wording to cover both non-generation and filtering of the ICMP message.
- The large-packet diagnostic comment treated a timeout as definitive proof of a black hole. I changed it to describe the result as a possible black hole or filtered ICMP path, while keeping the successful "Frag needed"/"message too long" interpretation.
- The `tracepath` description said it shows MTU at each hop, which is not what the tool documents. I corrected the text to match `tracepath(8)`, which reports the discovered path MTU and prints `pmtu N` when it changes.
- The per-hop `traceroute | ping each hop` loop was not a reliable way to locate an MTU black hole, because echoing router interface addresses does not prove the forwarding path to the destination. I replaced it with `traceroute --mtu`, which is the documented MTU-discovery mode.
- The packet-capture example used `ping -M do -s 1473`, which exceeds a standard 1500-byte local IPv4 MTU once IP and ICMP headers are added and can fail locally instead of testing the path. I corrected it to `1472` and noted that the failing size from the earlier threshold test can be reused.
- The socket-option example used `PMTUDISC_DONT`, but Linux documents the constant as `IP_PMTUDISC_DONT` for use with `IP_MTU_DISCOVER`. I corrected the constant name and scoped the note to IPv4.

## Review Notes
The post is now technically correct for IPv4/Linux troubleshooting. It is IPv4-specific: IPv6 black-hole cases use ICMPv6 Packet Too Big rather than ICMP type 3 code 4. Modern Linux systems may use the `iptables-nft` backend, but the `iptables` commands shown remain valid.
