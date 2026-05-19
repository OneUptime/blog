# Validation Summary: How to Configure Proxy ARP on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- Linux IPv4 networking
- ARP and proxy ARP
- iproute2 (`ip route`, `ip neigh`)
- sysctl kernel parameters
- net-tools `arp`
- arptables
- tcpdump

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.8/networking/ip-sysctl.html
- Linux `arp(7)` manual page: https://www.man7.org/linux/man-pages/man7/arp.7.html
- Linux `arp(8)` manual page from local net-tools package
- Linux `ip-neighbour(8)` manual page from local iproute2 package
- Linux `ip-route(8)` manual page from local iproute2 package
- `arptables-nft(8)` manual page: https://man7.org/linux/man-pages/man8/arptables-nft.8.html
- RFC 826, An Ethernet Address Resolution Protocol: https://www.rfc-editor.org/rfc/rfc826

## Issues Found
- The description referred to proxy ARP as enabling transparent layer-2 bridging. Proxy ARP is a routing behavior that answers ARP on behalf of another IPv4 destination, so this was changed to "transparent routing."
- The VPN example listed LAN hosts as `192.168.1.1` through `192.168.1.100` while also assigning `192.168.1.1` to the Ubuntu gateway. The LAN host range was changed to start at `192.168.1.2`.
- The "specific networks" section said `proxy_arp_pvlan` can restrict proxy ARP to address ranges. Kernel documentation defines `proxy_arp_pvlan` as private-VLAN same-interface proxy ARP behavior, not address-range selection, so that reference was removed.
- The manual proxy ARP command used `<MAC_of_eth0>`, which the shell would treat as input redirection if copied. It was replaced with `ip neigh add proxy ... dev eth0` and a valid legacy `arp -Ds ... pub` alternative.
- The `ip neigh show` example was made more precise by using `ip neigh show proxy` for proxy neighbor entries.
- The `arptables` example matched ARP requests while describing control over proxied replies. It was changed to filter outgoing ARP replies with `--opcode Reply` and `--source-ip`.
- The monitoring section described `/proc/net/arp` as a counter for ARP responses. It is the kernel ARP cache, so the comment was corrected.
- The ARP timeout note described `base_reachable_time_ms` as seconds with a default of 60. It is measured in milliseconds and defaults to 30000 ms, so the note was corrected.
- The `gc_stale_time` comment called it a garbage collection threshold. It controls how often stale neighbor entries are checked, so the comment was corrected.

## Review Notes
The post is technically relevant and the corrected commands align with current Linux kernel, iproute2, net-tools, and arptables behavior. Future improvements could mention that Ubuntu interface names are often predictable names such as `ens3` or `enp0s3` rather than `eth0`, but `eth0` is acceptable for an example.
