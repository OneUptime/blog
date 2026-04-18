# Validation Summary: How to Troubleshoot IPv6 IoT Connectivity Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (SLAAC, DHCPv6-PD, ICMPv6, Router Advertisements)
- 6LoWPAN / mesh networking
- RPL (Routing Protocol for Low-Power and Lossy Networks)
- radvd / odhcpd (Router Advertisement daemons)
- ndisc6 package (rdisc6, ndisc6)
- iproute2 (`ip -6`)
- ip6tables
- tcpdump (BPF filters for ICMPv6)
- RIOT OS (ifconfig, rpl shell commands)
- OpenThread
- CoAP / libcoap (coap-client)
- nmap (IPv6 UDP scan)

## Sources Consulted
- ndisc6 project documentation (https://www.remlab.net/ndisc6/) — verified rdisc6 vs ndisc6 distinction
- RFC 4861 (Neighbor Discovery for IPv6) — RS/RA message types
- radvd.conf(5) manual — AdvDefaultLifetime semantics
- libcoap coap-client documentation — `-m`, `-v`, `-B` flags
- IANA Service Name and Transport Protocol Port Number Registry — CoAP on UDP 5683
- tcpdump pcap-filter(7) — `ip6[40]` offset for ICMPv6 type field (post-40-byte IPv6 header)
- RIOT OS documentation — GNRC `ifconfig` and `rpl` shell commands
- nmap(1) manual — `-6 -sU -p` flags

## Issues Found
- **Incorrect command for forcing Router Advertisement** (Step 3, Linux-based IoT gateway section): The post used `sudo ndisc6 -r 3 eth0` to "Force RA request". `ndisc6` sends Neighbor Solicitations and requires a target IPv6 address (syntax: `ndisc6 [options] IPV6-ADDRESS INTERFACE`); it cannot be invoked with only an interface argument. To trigger a Router Advertisement you must send a Router Solicitation, which is what `rdisc6` does. Changed to `sudo rdisc6 -r 3 eth0` and clarified the comment to note that this sends a Router Solicitation.

## Review Notes
- The illustrative address `2001:db8:iot:1::sensor1` is not a syntactically valid IPv6 address (`iot` and `sensor1` aren't hex). It's clearly a placeholder that readers are expected to substitute, and using the documentation prefix `2001:db8::/32` (RFC 3849) is appropriate. Left as-is since the intent is clear from context.
- `ping6` is the traditional binary name, now deprecated in favor of `ping -6` / unified `ping` on modern iputils. Both still exist on most distros, so the examples remain functional.
- The `tcpdump` filter `icmp6 and ip6[40] == 134` relies on the assumption of no IPv6 extension headers between the fixed 40-byte IPv6 header and the ICMPv6 payload. This is the conventional form for RA capture and works in virtually all real-world RA traffic.
- The RIOT OS `ifconfig` output line `inet6 addr: <global address>  scope: global  VAL` matches current GNRC output format (the `VAL` suffix denotes a valid address).
