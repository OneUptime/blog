# Validation Summary: How to Diagnose and Fix TCP Connection Resets Across Firewalls

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- TCP reset (RST) behavior
- IPv4 TTL
- tcpdump and libpcap capture filters
- Linux conntrack and sysctl
- TCP keepalive
- iptables/netfilter
- AWS NAT Gateway and Network Load Balancer idle timeouts
- ss and conntrack CLI tools

## Sources Consulted
- RFC 9293, Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- RFC 791, Internet Protocol: https://datatracker.ietf.org/doc/html/rfc791
- The Tcpdump Group libpcap pcap-filter manpage source: https://raw.githubusercontent.com/the-tcpdump-group/libpcap/master/pcap-filter.manmisc.in
- The Tcpdump Group tcpdump manpage source: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in
- Linux kernel nf_conntrack sysctl documentation: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.12/networking/ip-sysctl.html
- Linux tcp(7) manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Netfilter iptables-extensions manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Netfilter conntrack-tools manual page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- AWS NAT Gateway troubleshooting documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html
- AWS Network Load Balancer connection idle timeout documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html

## Issues Found
- The opening RST attribution was too absolute. Updated it to require endpoint packet captures before concluding that a middlebox or injected traffic is the likely source.
- The RST source guidance implied source IP alone is definitive. Added a caveat that middleboxes can generate RSTs using endpoint IPs and that endpoint-side captures should verify the source.
- The TCP keepalive comments implied sysctl changes enable keepalive. Clarified that the sysctls configure timers and that applications or services must enable SO_KEEPALIVE for those timers to apply.
- The AWS section was titled as a Security Group / ACL mismatch, but the described 350-second reset behavior is AWS NAT Gateway idle timeout behavior. Renamed the section and adjusted the symptom and fix wording.
- The iptables section mixed "reject" wording with a DROP command. Updated the heading and comment to match the Netfilter recommendation to DROP INVALID packets instead of rejecting them with TCP RST.
- The server restart guidance said to ensure an application-level RST on shutdown. Reworded it to drain or close connections before shutdown so peers see FIN/RST.
- The TTL guidance incorrectly said a close firewall would show a low TTL. Corrected it to compare remaining TTL/hop-count context, where a close middlebox usually shows fewer TTL decrements than a distant endpoint. Added `-l` to the piped tcpdump command so grep receives live line-buffered output.

## Review Notes
Local command checks compiled the tcpdump filters with tcpdump 4.99.4/libpcap 1.10.4 and confirmed the iptables conntrack, LOG, REJECT, and `ss -tan state syn-sent` syntax. The local environment did not have the `conntrack` binary installed, so `conntrack -L` and `conntrack -F` syntax was verified against the Netfilter conntrack-tools man page.
