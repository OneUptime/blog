# Validation Summary: How to Protect Against SYN Flood Attacks with SYN Cookies

## Status
validated

## Post Type
Technical tutorial / Linux security guide

## Technologies Covered
- TCP
- SYN flood attacks
- SYN cookies
- Linux kernel sysctl networking parameters
- iptables / netfilter
- ss, netstat, tcpdump, awk

## Sources Consulted
- Linux Kernel IP Sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- RFC 4987, "TCP SYN Flooding Attacks and Common Mitigations": https://datatracker.ietf.org/doc/html/rfc4987
- procps-ng sysctl(8) manual: https://man7.org/linux/man-pages/man8/sysctl.8.html
- procps-ng sysctl.conf(5) manual: https://man7.org/linux/man-pages/man5/sysctl.conf.5.html
- iptables-extensions(8) manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- iproute2 ss(8) manual: https://man7.org/linux/man-pages/man8/ss.8.html
- net-tools netstat(8) manual: https://linuxman7.org/linux/man-pages/man8/netstat.8.html
- libpcap pcap-filter(7) manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local command help/parsing checks for sysctl, iptables, ss, netstat, grep, watch, and tcpdump.

## Issues Found
- The SYN cookie flow diagram showed the SYN-ACK arrow pointing toward the server. Changed it to show the server sending the SYN-ACK to the client, matching the TCP handshake and RFC 4987 SYN cookie description.
- The iptables logging rule was appended after a broader DROP rule, so it would never log the excess SYN packets. Reordered the example to LOG first and then DROP, matching the iptables LOG target behavior.
- The SYN_RECV counting command used `ss -n state syn-recv | wc -l`, which can include headers and query non-TCP sockets. Changed it to `ss -Htan state syn-recv | wc -l` to count TCP SYN_RECV rows without a header.
- The `ss -s` comment claimed the output would show SYN retransmissions. Changed it to say the output summarizes socket counts, including SYN_RECV when present.
- The tcpdump source-finding command matched any packet with the SYN flag, including SYN-ACK packets, and extracted `source-ip.source-port` rather than a blockable IP address. Changed the filter to match initial SYN packets without ACK and replaced the extraction with an awk command that strips the source port.
- The description and closing sentence implied guaranteed legitimate service availability during attacks. Softened the wording because SYN cookies and global packet rate limiting improve resilience but cannot guarantee no legitimate connection impact under all attack conditions.

## Review Notes
The sysctl names and formats are valid. Linux kernel documentation treats SYN cookies as a fallback for SYN backlog overflow, not a substitute for tuning overloaded legitimate traffic. The iptables limit example is a global SYN rate limit, so production values should be tuned carefully to avoid dropping legitimate bursts. The tcpdump example remains IPv4-focused because the pcap `tcp[...]` packet-data accessor applies to IPv4 transport headers.
