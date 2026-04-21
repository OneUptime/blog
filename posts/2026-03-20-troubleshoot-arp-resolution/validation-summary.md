# Validation Summary: How to Troubleshoot ARP Resolution Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ARP / IPv4 neighbor discovery
- Linux iproute2 (`ip addr`, `ip route`, `ip neigh`, `ip link`)
- iputils `arping`
- tcpdump / libpcap packet filters
- Linux IPv4 ARP sysctls (`arp_filter`, `arp_ignore`, `proxy_arp`)
- ebtables / Ethernet bridge filtering
- ethtool and kernel log diagnostics
- Python `ipaddress`

## Sources Consulted
- RFC 826: An Ethernet Address Resolution Protocol: https://datatracker.ietf.org/doc/html/rfc826
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- iproute2 `ip-neighbour(8)` man page: https://manpages.debian.org/unstable/iproute2/ip-neighbour.8.en.html
- iproute2 `ip-address(8)` man page: https://manpages.debian.org/testing/iproute2/ip-address.8.en.html
- iproute2 `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 `ip-link(8)` man page: https://manpages.debian.org/testing/iproute2/ip-link.8.en.html
- iputils `arping(8)` man page: https://manpages.debian.org/testing/iputils-arping/arping.8.en.html
- tcpdump man page: https://manpages.debian.org/trixie/tcpdump/tcpdump.8.en.html
- libpcap filter syntax: https://manpages.debian.org/trixie/libpcap0.8t64/pcap-filter.7.en.html
- procps-ng `sysctl(8)` man page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- ethtool man page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- dmesg man page: https://man7.org/linux/man-pages/man1/dmesg.1.html
- Debian ebtables source/man page: https://sources.debian.org/data/main/e/ebtables/2.0.11-6/ebtables-legacy.8.in
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Local command help output for `ip`, `tcpdump`, `sysctl`, `ethtool`, `dmesg`, and `ebtables`
- Related OneUptime links were checked with HTTP HEAD requests and returned HTTP 200.

## Issues Found
- The tcpdump example put the `arp` filter before `-i eth0`. It may work with some tcpdump builds, but the documented syntax places options before the filter expression. Changed it to `tcpdump -n -e -i eth0 arp`.
- The `arp_filter` explanation was inaccurate. Linux `arp_filter=1` answers based on route selection for the interface, not simply because the request arrived on that interface. Updated the comment.
- The `arp_ignore=0` explanation said "respond to all", which was too broad. Linux replies for local target IPs, including addresses configured on other interfaces. Updated the comments for `arp_ignore=0` and `arp_ignore=1`.
- The firewall check comment said "iptables" while the command used `ebtables`. Updated the comment to match the ARP-capable Ethernet filtering tool being shown.

## Review Notes
`arping` was not installed in the local environment, but its command syntax was verified against the iputils man page. On Linux, effective ARP sysctl behavior can also depend on `conf/all` as well as the per-interface value; this could be noted in a future expansion.
