# Validation Summary: How to Troubleshoot ICMP Fragmentation Needed Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv4
- Path MTU Discovery (PMTUD)
- Linux networking tools: `ping`, `tracepath`, `tcpdump`, `iptables`, `ip`
- VPN and tunnel MTU troubleshooting

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1191, Path MTU Discovery: https://datatracker.ietf.org/doc/rfc1191/
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tracepath.8.html
- `pcap-filter(7)` Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Netfilter `TCPMSS` extension documentation: https://git.netfilter.org/iptables/tree/extensions/libxt_TCPMSS.man?h=v1.8.8&id=adbfec0b3e3275ea5e7c933b630756cf01a4f8c6
- Local CLI help output checked on 2026-04-30: `ping -h`, `tracepath -h`, `tcpdump --help`, `iptables -p icmp -h`, `iptables -j TCPMSS -h`, `ip link help`
- Large-file test URL verified with `curl -I` on 2026-04-30: https://proof.ovh.net/files/100Mb.dat

## Issues Found
- The `tracepath` example text said it "Shows MTU at each hop", which overstates what the tool reports. I changed the wording and sample output to reflect that `tracepath` reveals discovered path-MTU changes along the path.
- The packet-capture explanation said missing ICMP always means the router is silently dropping packets. I corrected this to note that the ICMP error may also be filtered on the return path, which is another common PMTUD failure mode.
- The large-transfer verification URL `http://speed.cloudflare.com/100mb.bin` no longer works as written. I replaced it with a currently valid large test file URL.
- The verification ping used a 1472-byte payload even after the post recommended lowering MTU or clamping MSS. I changed it to use the example discovered path MTU (`1372` payload for a `1400`-byte PMTU), which matches the preceding guidance.

## Review Notes
Examples are Linux-specific and IPv4-specific. MSS clamping affects TCP only, so ICMP echo tests still need to use a payload size that fits the discovered path MTU. The `iptables` commands remain valid on systems using the `iptables-nft` compatibility frontend.
