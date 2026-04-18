# Validation Summary: How to Troubleshoot VXLAN Connectivity on Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN)
- Linux networking (iproute2, bridge utilities)
- iptables
- tcpdump
- nmap / netcat (nc)
- FDB (Forwarding Database) management
- VTEP (VXLAN Tunnel Endpoint)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN) specification: https://datatracker.ietf.org/doc/html/rfc7348
- iproute2 `ip-link(8)` man page (VXLAN section)
- `bridge(8)` man page (fdb subcommand)
- IANA Service Name and Transport Protocol Port Number Registry (UDP 4789 assigned to VXLAN)
- Linux kernel VXLAN driver documentation: https://www.kernel.org/doc/Documentation/networking/vxlan.rst
- iptables(8) and tcpdump(8) man pages

## Issues Found
No technical issues found.

Verified details:
- UDP port 4789 is the IANA-assigned VXLAN port per RFC 7348.
- VXLAN overhead is 50 bytes (14 outer Ethernet + 20 outer IPv4 + 8 UDP + 8 VXLAN header), so an MTU of 1450 on a 1500-byte underlay is correct.
- `ping -s 1422 -M do` produces a 1450-byte IP packet (1422 payload + 8 ICMP + 20 IP) — exactly MTU-sized, correct for edge testing with DF bit set.
- The all-zeros MAC (`00:00:00:00:00:00`) is the conventional flood entry MAC in Linux VXLAN FDB.
- `bridge fdb append ... dev vxlan0 dst <IP> permanent` is valid iproute2 syntax for adding head-end replication flood entries.
- `ip -d link show vxlan0` output includes the `vxlan id <VNI> dev <underlay> ...` line as claimed.
- `tcpdump -i eth0 udp port 4789 -n`, `iptables -A INPUT -p udp --dport 4789 -j ACCEPT`, `nmap -sU -p 4789`, and `nc -u` are all syntactically correct.

## Review Notes
- Minor nuance not worth correcting in the post: The Linux kernel VXLAN driver historically defaulted to UDP port 8472 for backward compatibility. Most modern deployments (and any interoperability with non-Linux VTEPs like VMware NSX, Cisco Nexus, etc.) explicitly use `dstport 4789`, which is the IANA-standard port the post assumes. If a reader's VXLAN interface was created without an explicit `dstport`, they would need to check/filter on 8472 instead.
- UDP reachability via `nc -u` is not fully reliable for testing because UDP is connectionless — a lack of response does not necessarily imply a blocked port. `nmap -sU` is more trustworthy and the post correctly offers it as an alternative.
- For IPv6 underlays the overhead is 70 bytes (not 50), giving an MTU of 1430 rather than 1450 — outside the scope of this post but worth noting for readers operating over IPv6.
