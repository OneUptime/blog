# Validation Summary: How to Troubleshoot IPv4 Network Connectivity Issues on Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux network interfaces
- IPv4 addressing and routing
- DHCP with dhclient
- ICMP ping and path MTU testing
- DNS troubleshooting with nslookup, dig, and resolv.conf
- systemd-resolved and NetworkManager DNS configuration
- iptables firewall rules
- ARP neighbor and duplicate-address checks
- traceroute and mtr path diagnostics

## Sources Consulted
- Linux kernel operational state documentation: https://docs.kernel.org/networking/operstates.html
- iproute2 ip-link manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 ip-address manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- iproute2 ip-route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 ip-neighbour manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- iputils ping manual: https://man7.org/linux/man-pages/man8/ping.8.html
- iputils arping manual: https://man7.org/linux/man-pages/man8/arping.8.html
- Netfilter iptables manual: https://ipset.netfilter.org/iptables.man.html
- traceroute manual: https://man7.org/linux/man-pages/man8/traceroute.8.html
- mtr manual: https://manpages.ubuntu.com/manpages/jammy/man8/mtr.8.html
- BIND 9 dig and nslookup manuals: https://bind9.readthedocs.io/en/latest/manpages.html
- resolv.conf manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- systemd-resolved manual: https://man7.org/linux/man-pages/man8/systemd-resolved.service.8.html
- NetworkManager IPv4 settings reference: https://www.networkmanager.dev/docs/api/latest/settings-ipv4.html

## Issues Found
- The static IP assignment example was incomplete. Changed `sudo ip addr add` to `sudo ip addr add <address>/<prefix> dev eth0`, matching the documented `ip address add IFADDR dev IFNAME` syntax.
- The external-IP ping failure explanation was too definitive. Changed it to say this is likely a routing issue beyond the local network or a firewall blocking ICMP/outbound traffic.
- The iptables flush comment incorrectly said `iptables -F` flushes all rules. Changed it to specify filter-table rules, because the default table is `filter` and `-F` applies to the selected table.
- Step 8 implied checking routing on the remote end/asymmetric routing with `ip route get`. Changed the heading and comment to clarify that `ip route get` checks the local route that would be used.
- The conclusion claimed most Linux connectivity issues are DNS-related. Changed "Most" to "Many" to avoid an unsupported statistic-like claim.

## Review Notes
- The examples assume the interface is named `eth0`; many distributions use predictable names such as `ens*` or `enp*`, so readers must substitute their actual interface name.
- Some tools shown here, including `dhclient`, `dig`, `nslookup`, `traceroute`, `mtr`, and `arping`, may need to be installed separately depending on the distribution.
- Modern systems may use nftables, firewalld, NetworkManager, or systemd-networkd behind or instead of direct iptables and dhclient workflows. The commands remain valid for the contexts described.
