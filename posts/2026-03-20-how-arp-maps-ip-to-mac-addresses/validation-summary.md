# Validation Summary: How to Understand How ARP Maps IP Addresses to MAC Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- IPv4
- Ethernet and MAC addressing
- Scapy
- Linux networking commands (`ip neigh`, `arp`)
- macOS `arp`
- Windows `arp`

## Sources Consulted
- RFC 826, *An Ethernet Address Resolution Protocol*: https://www.rfc-editor.org/rfc/rfc826.html
- RFC 5227, *IPv4 Address Conflict Detection*: https://www.rfc-editor.org/rfc/rfc5227.html
- Scapy Usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy network stack / routing documentation: https://scapy.readthedocs.io/en/stable/routing.html
- Apple Developer, *Networking Concepts: Packet Routing and Delivery*: https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NetworkingConcepts/PacketRoutingandDelivery/PacketRoutingandDelivery.html
- Linux `arp(7)` manual page: https://man7.org/linux/man-pages/man7/arp.7.html
- Linux `ip-neighbour(8)` manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- Microsoft Learn, `arp` command: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp
- Local `ip neigh help` output from the installed `iproute2` tooling
- Local `arp --help` output from the installed `net-tools` tooling

## Issues Found
- The Scapy example hard-coded `eth0` as the default interface. I changed the function to use Scapy's default interface unless the caller explicitly passes one, because modern systems often use interface names like `en0`, `ens*`, or `wlp*`, and Scapy supports omitting `iface`.
- The Scapy example declared a `str` return type while returning `None` on no response. I corrected the annotation to `str | None` so the signature matches the documented behavior.
- The Scapy example did not mention that sending layer-2 packets generally requires elevated privileges. I added a one-line note to match Scapy's documented requirements.
- The ARP cache section stated a "typically 5–20 minutes on Linux/macOS" timeout. I replaced that with OS-specific cache-aging language because Linux neighbor cache behavior is governed by timers and state transitions rather than one stable cross-platform timeout.
- In the ARP packet structure, "dest MAC (reply)" was imprecise for the target hardware address field. I changed it to "requester's MAC (reply)".

## Review Notes
- The Linux `arp` utility is still valid where installed, but `ip neigh show` is the more modern Linux command and is already listed first.
- The post is correctly scoped to IPv4; IPv6 neighbor resolution uses NDP rather than ARP.
