# Validation Summary: How to Understand IPv6 Multicast for IoT Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 multicast
- Neighbor Discovery and MLD
- CoAP
- Python `aiocoap`
- mDNS / DNS-SD
- Python `zeroconf`
- DHCPv6
- RPL
- Thread

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 6550, RPL: IPv6 Routing Protocol for Low-Power and Lossy Networks: https://datatracker.ietf.org/doc/html/rfc6550
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762.html
- RFC 7252, The Constrained Application Protocol (CoAP): https://datatracker.ietf.org/doc/html/rfc7252
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- aiocoap FAQ: https://aiocoap.readthedocs.io/en/latest/faq.html
- aiocoap protocol documentation: https://aiocoap.readthedocs.io/en/latest/module/aiocoap.protocol.html
- python-zeroconf API reference: https://python-zeroconf.readthedocs.io/en/latest/api.html
- python-zeroconf Zeroconf core docs: https://python-zeroconf.readthedocs.io/en/stable/_modules/zeroconf/_core.html
- OpenThread IPv6 Addressing guide: https://openthread.io/guides/thread-primer/ipv6-addressing.md
- `pcap-filter(7)` syntax reference: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `avahi-browse(1)` man page: https://www.manpagez.com/man/1/avahi-browse/
- `dns-sd(1)` macOS man page: https://manp.gs/mac/1/dns-sd

## Issues Found
- The multicast-address table contained several incorrect assignments. I corrected the RA/RS mix-up for `ff02::2`, changed `ff02::fd` to All CoAP Nodes, changed the RPL entry to `ff02::1a`, corrected DHCPv6 server scope from `ff02::1:3` to `ff05::1:3`, and replaced the incorrect fixed Thread row with `ff03::1` for Thread mesh-local all FTDs and MEDs.
- The CoAP discovery example omitted the interface scope that link-local multicast commonly requires. I changed the URI to include an interface scope and clarified that aiocoap’s multicast client interface exposes only the first response.
- The mDNS responder example used `Zeroconf()` without an IP-version override even though current `python-zeroconf` defaults to IPv4-only for backward compatibility. I imported `IPVersion` and set `Zeroconf(ip_version=IPVersion.V6Only)`.
- The mDNS responder example also used an invalid IPv6 literal (`2001:db8:iot:1::sensor1`). I replaced it with a valid documentation-prefix IPv6 address.
- The sample MLD group-membership output referenced `ff02::1:3`, which is not the DHCPv6 all-servers group. I replaced that example entry with a valid IoT-relevant multicast group.
- The `tcpdump` filter for MLD assumed the ICMPv6 type field was always at `ip6[40]`. That is unreliable for MLD because MLD uses a Hop-by-Hop Router Alert header. I replaced it with a filter based on `ip6 protochain 58` and updated the MLD type notes.
- The group-command example used an invalid address (`ff05::zone1`) and then the site-local all-nodes address (`ff05::1`) instead of a custom multicast group. I replaced both with a valid custom site-local multicast address and added a bounded wait so the example does not block indefinitely if no device responds.

## Review Notes
- `dns-sd` and `avahi-browse` are both valid examples, but they are platform-specific: `dns-sd` is typical on Bonjour/macOS systems, while `avahi-browse` is typical on Linux with Avahi.
- Thread multicast for all Thread nodes, including sleepy end devices, can use unicast-prefix-based multicast addresses that vary by network. The fixed Thread row in the post was kept to a documented fixed address (`ff03::1`) to avoid overstating a network-specific address as universal.
- aiocoap’s current multicast client support remains partial. The post now reflects the documented limitation that the request interface exposes only the first response.
