# Validation Summary: How to Interpret ICMP Port Unreachable for UDP Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- UDP
- IPv4
- `tcpdump`
- `nc` / netcat
- `nmap`
- `ss`
- `iptables`
- `systemd-resolved`

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1122, Requirements for Internet Hosts - Communication Layers: https://www.rfc-editor.org/rfc/inline-errata/rfc1122.html
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- Nmap official docs, UDP Scan (`-sU`): https://nmap.org/book/scan-methods-udp-scan.html
- Nmap official docs, Port Scanning Basics: https://nmap.org/book/man-port-scanning-basics.html
- `systemd-resolved.service` documentation: https://www.freedesktop.org/software/systemd/man/253/systemd-resolved.html
- Linux kernel IP sysctl documentation (`icmp_ratemask`, ICMP rate limiting): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc.1
- Local `nc(1)` man page and `nc -h` output
- Local `tcpdump(8)` man page and `tcpdump -d 'icmp[0]=3 and icmp[1]=3'`
- Local `ss --help` output
- Local `iptables -j REJECT --help` output

## Issues Found
- The introduction and early explanation said ICMP Port Unreachable comes from the destination host and not from a router or firewall. I corrected this to reflect the standard closed-port case from RFC 1122 while also noting that a firewall configured to reject traffic can return the same ICMP code.
- The `nc` examples treated UDP outcomes as deterministic and implied that no visible error means the port is open or filtered. I added timeouts, clarified that `Connection refused` indicates the local stack received ICMP Port Unreachable, and noted that no visible error can also be caused by ICMP rate limiting or tool behavior.
- The `nmap -sU` explanation said `open|filtered` means no response because the port may be open or firewall-blocked. I tightened this to include the documented ambiguity around silent filtering and missing ICMP responses.
- The manual netcat trigger example implied `nc` itself would reliably show the ICMP failure. I changed it to use `tcpdump` as the confirmation mechanism and corrected the interpretation of the result.
- The DNS troubleshooting example recommended `systemctl start systemd-resolved` as a generic fix for UDP port 53. I removed that because the official `systemd-resolved` docs show it is typically a local stub listener on `127.0.0.53:53`, not a general network-facing DNS service for remote clients.
- The firewall comparison section and conclusion described ICMP Port Unreachable as unambiguous proof of a closed application port. I corrected that wording to account for `iptables`/netfilter `REJECT --reject-with icmp-port-unreachable` and for ICMP rate limiting.

## Review Notes
- The packet-capture filter `icmp[0]=3 and icmp[1]=3` is valid for IPv4 ICMP and matches the post’s IPv4 scope. It does not apply to ICMPv6.
- `nmap` was not installed in this environment, so its command semantics were verified against Nmap’s official documentation rather than local `--help` output.
