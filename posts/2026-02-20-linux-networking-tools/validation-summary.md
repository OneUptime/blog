# Validation Summary: Essential Linux Networking Tools for DevOps Engineers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux networking
- iproute2 `ip` and `ss`
- BIND `dig`
- curl
- traceroute
- mtr
- tcpdump and libpcap filter syntax
- netcat (`nc`)
- ping
- iptables
- Mermaid diagrams

## Sources Consulted
- iproute2 `ip` manual pages: https://man7.org/linux/man-pages/man8/ip.8.html and https://man7.org/linux/man-pages/man8/ip-route.8.html
- Debian iproute2 `ss` manual page: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
- ISC BIND 9 `dig` manual pages: https://bind9.readthedocs.io/en/latest/manpages.html
- curl command-line documentation: https://curl.se/docs/manpage.html
- Linux traceroute manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Official mtr repository and local `mtr --help`: https://github.com/traviscross/mtr
- tcpdump manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- libpcap filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- OpenBSD `nc` manual page: https://man.openbsd.org/nc.1
- iputils `ping` manual page: https://manpages.opensuse.org/Tumbleweed/iputils/ping.8.en.html
- Local command help/version output for `ip`, `ss`, `dig`, `curl`, `mtr`, `tcpdump`, `nc`, and `ping`

## Issues Found
- The IPv4 `ip` example claimed to show addresses in a compact format while using `ip -4 addr show`, which is not the brief output form. Changed it to `ip -br -4 addr show`.
- The neighbor table comment described `ip neigh show` as only ARP. Changed it to ARP/NDP because Linux neighbor entries cover IPv4 ARP and IPv6 Neighbor Discovery.
- The TIME-WAIT `ss` example described TIME-WAIT as a common connection leak indicator. Changed the wording to connection churn because TIME-WAIT is a normal TCP state and high counts are not necessarily a leak.
- The DNS resolution diagram used `93.184.216.34` as the A record for `oneuptime.com`, but that is not OneUptime's current A record. Replaced the hardcoded value with "current IP address" so the diagram stays accurate as DNS changes.
- The traceroute TCP example said TCP was used instead of ICMP. Linux traceroute defaults to UDP probes, while TCP mode sends TCP SYN probes. Updated the comment accordingly.
- The practical `ss` scenario used `ss -tn dst db.internal.example.com:5432`, but `ss` destination/source filters expect address expressions and this form fails with a hostname. Changed it to `ss -tn dport = :5432`.

## Review Notes
- Netcat flags vary between OpenBSD netcat, traditional netcat, BusyBox `nc`, and Nmap Ncat. The examples match common OpenBSD netcat behavior on modern Linux distributions, but portability notes could be added in a future broader rewrite.
- The firewall examples use `iptables`, which remains common, but many current Linux distributions use nftables directly or an nftables-backed iptables compatibility layer.
