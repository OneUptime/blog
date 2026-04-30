# Validation Summary: How to Troubleshoot IPv4 Packet Fragmentation and Reassembly Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- Path MTU Discovery (PMTUD)
- ICMP
- `ping`
- `tcpdump`
- Linux `ip` / interface MTU configuration
- iptables `TCPMSS`
- nftables TCP MSS clamping
- Linux IP fragmentation and reassembly counters

## Sources Consulted
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191.html
- RFC 2923, TCP Problems with Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc2923
- Linux `ping(8)`: https://www.man7.org/linux/man-pages/man8/ping.8.html
- Linux `pcap-filter(7)`: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux `ip-link(8)`: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `iptables-extensions(8)`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables man page: https://netfilter.org/projects/nftables/manpage.html
- macOS `ping(8)`: https://manp.gs/mac/8/ping
- Linux kernel SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html
- Local command help and local system validation: `ping -h`, `man ping`, `man ip-link`, `man iptables-extensions`, `man nft`, `cat /proc/net/snmp`, `netstat -s`

## Issues Found
- The Linux `ping` examples used `-M do`. Current Linux `ping(8)` documents `-M probe` as the mode intended for PMTU probing, while `-M do` remains subject to kernel PMTU checks and can reject oversized packets before probing the path. Updated the Linux examples and the matching takeaway to use `ping -M probe`.

## Review Notes
- The post is technically sound after the `ping` correction. The guidance is primarily Linux-focused, with a macOS-specific `ping` example.
