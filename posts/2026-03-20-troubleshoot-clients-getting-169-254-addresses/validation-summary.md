# Validation Summary: How to Troubleshoot Clients Getting 169.254.x.x Addresses

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- DHCPv4
- IPv4 link-local addressing / APIPA
- DHCP relay
- VLAN troubleshooting
- Linux iproute2
- tcpdump / libpcap filters
- ISC dhclient
- Nmap NSE broadcast DHCP discovery
- ISC DHCP lease database
- iptables / netfilter

## Sources Consulted
- RFC 3927: Dynamic Configuration of IPv4 Link-Local Addresses - https://datatracker.ietf.org/doc/html/rfc3927
- RFC 2131: Dynamic Host Configuration Protocol - https://datatracker.ietf.org/doc/html/rfc2131
- ISC DHCP 4.4 dhclient manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 dhcpd.leases manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP EOL notice - https://www.isc.org/blogs/isc-dhcp-eol/
- Nmap broadcast-dhcp-discover NSE documentation - https://nmap.org/nsedoc/scripts/broadcast-dhcp-discover.html
- Debian ip-link(8) man page - https://manpages.debian.org/testing/iproute2/ip-link.8.en.html
- Debian tcpdump(8) and pcap-filter(7) man pages - https://manpages.debian.org/trixie/tcpdump/tcpdump.8.en.html and https://manpages.debian.org/trixie/libpcap0.8t64/pcap-filter.7.en.html
- Debian iptables(8) and iptables-extensions(8) man pages - https://manpages.debian.org/trixie/iptables/iptables.8.en.html and https://manpages.debian.org/trixie/iptables/iptables-extensions.8.en.html
- Local CLI help output for `ip`, `tcpdump`, and `iptables`

## Issues Found
- The post described any 169.254.x.x address as definitely APIPA caused by DHCP failure. RFC 3927 defines 169.254/16 as IPv4 link-local addressing used when routable address configuration is unavailable, so the wording was changed to "IPv4 link-local/APIPA" and "usually failed to obtain a DHCP lease."
- The relay-agent cause said the relay was not "forwarding broadcasts." RFC 2131 describes relay agents as passing DHCP messages between clients and servers, so the wording was changed to "not relaying client requests."
- The `dhclient -v` description claimed it shows the exact failure point and called it the best first diagnostic. The ISC manual says `-v` enables verbose log messages, so the wording was changed to say it shows DHCP exchange details and is useful when ISC dhclient is installed.
- The DHCP pool exhaustion command used `grep -c "binding state active"` on `dhcpd.leases`. ISC documents the lease file as log-structured, where the last declaration for a lease is current, so a raw grep can overcount stale active entries. The command was replaced with an `awk` snippet that tracks the current binding state per lease address before counting active leases.
- The firewall example opened UDP destination ports 67 and 68 on the DHCP server. RFC 2131 defines client-to-server traffic as destination port 67 and server-to-client traffic as destination port 68, so the example now distinguishes server-side UDP 67 from client-side UDP 68.
- The checklist named `isc-dhcp-server` as though it were universal. It was changed to mention `isc-dhcp-server` as an example or the site's DHCP daemon.

## Review Notes
The commands are Linux-oriented and assume interface `eth0`; many systems now use predictable interface names. ISC DHCP and dhclient are end-of-life, so these examples are best understood as diagnostics for existing ISC deployments rather than recommendations for new DHCP server deployments.
