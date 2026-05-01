# Validation Summary: How to Determine Maximum IPv4 Packet Size

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- ICMP
- Path MTU Discovery (PMTUD)
- Linux `ping`
- Linux `ip` / iproute2
- macOS `networksetup`
- Python 3
- Scapy

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792.html
- RFC 894, A Standard for the Transmission of IP Datagrams over Ethernet Networks: https://www.rfc-editor.org/rfc/rfc894
- RFC 1188, Proposed Standard for the Transmission of IP Datagrams over FDDI Networks: https://www.rfc-editor.org/rfc/rfc1188.html
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- RFC 2516, A Method for Transmitting PPP Over Ethernet (PPPoE): https://www.rfc-editor.org/rfc/rfc2516
- RFC 3580, IEEE 802.1X RADIUS Usage Guidelines: https://datatracker.ietf.org/doc/rfc3580/
- `ping(8)` iputils manual: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- `ip-link(8)` Linux manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-route(8)` Linux manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `networksetup(8)` macOS manual mirror: https://www.manpagez.com/man/8/networksetup/
- Scapy usage docs: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `scapy.layers.inet` API docs: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet.html
- Scapy `scapy.packet` API docs: https://scapy.readthedocs.io/en/latest/api/scapy.packet.html

## Issues Found
- The IPv4 Total Length explanation implied a raw numeric range of `0` to `65,535` for valid packets. I changed it to state that an IPv4 datagram can be up to `65,535` bytes and clarified that the `65,515`-byte payload figure assumes no IP options, which matches RFC 791.
- The Linux interface MTU example used legacy `ifconfig`. I replaced it with `ip link show dev eth0` so the command example aligns with current `iproute2` documentation.
- The PMTU `ping` comments were too absolute for an Internet path. I changed them to refer to the path MTU instead of “Ethernet” and added `-c 1` so the example behaves as a single probe.
- The `ip route get` note described the output as a cached path MTU. I changed that text to reflect current Linux behavior more accurately: it shows the resolved route entry and may include MTU information if the kernel has recorded it.
- The Scapy PMTU example treated any ICMP type `3` response as success, which is incorrect because ICMP type `3`, code `4` means “fragmentation needed and DF set” per RFC 792/RFC 1191. I fixed the logic to treat only echo replies as success, handle type `3`/code `4` as failure for that probe, check that an ICMP layer is present before indexing it, and document the raw-packet privilege requirement.
- The Scapy example used `576` as the default minimum search size. I changed it to `68`, which matches RFC 1191’s floor for Path MTU estimates.

## Review Notes
- `ip route get 8.8.8.8 | grep -i mtu` may legitimately print no MTU field until the kernel has PMTU information for that destination.
- The Scapy example is a best-effort probe; ICMP filtering and lack of raw-socket privileges can still prevent accurate results even when the code is correct.
