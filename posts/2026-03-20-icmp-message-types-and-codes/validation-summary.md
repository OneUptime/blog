# Validation Summary: How to Understand ICMP Message Types and Codes

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- IPv4
- `tcpdump`
- `ping`
- `nc` (netcat)

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- IANA ICMP Parameters registry: https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml
- OpenBSD `nc(1)` manual page: https://man.openbsd.org/nc.1
- Local `man ping(8)` and `ping -h` output from the installed `iputils` version
- Local `man pcap-filter(7)` and `tcpdump --help` output

## Issues Found
- The table labeled ICMP type 3 code 13 as "Communication Prohibited". RFC 1812 and the IANA registry define code 13 as "Communication Administratively Prohibited", so I corrected the name.
- The TTL example used `ping -t` without identifying that flag as Linux/iputils syntax. I updated the comment to say "on Linux" so the example is not presented as cross-platform `ping` syntax.
- The UDP `nc` example did not guarantee that any datagram would be sent, which meant it might not trigger ICMP type 3 code 3 as described. I changed it to pipe data into `nc -u -w 1` and adjusted the comment to reflect that the ICMP reply is conditional on the host being reachable and the UDP port being closed.

## Review Notes
- The `tcpdump` filters in the post use libpcap's IPv4 ICMP filter syntax (`icmp` and `icmp[0]`), which is appropriate for this IPv4-focused article.
- Whether an ICMP error is actually observed in practice still depends on the path, intermediate filtering, and endpoint behavior.
