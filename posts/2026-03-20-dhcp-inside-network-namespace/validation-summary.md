# Validation Summary: How to Set Up DHCP Inside a Network Namespace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- `iproute2` (`ip netns`, `ip link`, `ip addr`, `ip route`)
- `veth` virtual Ethernet pairs
- `dnsmasq`
- DHCPv4
- ISC `dhclient`

## Sources Consulted
- `dnsmasq` man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- ISC DHCP `dhclient` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- `veth(4)` Linux manual page: https://man7.org/linux/man-pages/man4/veth.4.html
- `ip-netns(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Local command help: `ip netns help`
- Local command help: `dnsmasq --help dhcp`

## Issues Found
- The architecture diagram and setup steps did not match. The original post showed a host-side veth and bridge path that was never configured or used, while the working example actually used a direct `veth-server`/`veth-client` pair between `dhcp-ns` and `client-ns`. I removed the unused host-side veth commands and corrected the diagram and Step 1 description to match the real topology.
- The original `dnsmasq` command advertised `8.8.8.8` as the DNS server even though the namespaces in the post had no uplink, forwarding, or NAT path to reach the public internet. I changed DHCP option 6 to `10.0.100.1` so the advertised DNS server is reachable in the topology being demonstrated.
- The original post relied on default lease/PID file locations for `dnsmasq` and `dhclient`. Because `ip netns exec` changes the network namespace but not the filesystem namespace, those default files can collide with host or other namespace instances. I added explicit `--dhcp-leasefile` for `dnsmasq` and explicit `-pf`/`-lf` arguments for `dhclient`, and updated the lease inspection and release commands to use those same files.

## Review Notes
- `dnsmasq`'s `--interface`, `--bind-interfaces`, `--dhcp-range`, `--dhcp-option`, `--pid-file`, and `--dhcp-leasefile` flags are valid per the current `dnsmasq` manual.
- The DHCP option numbers used in the post are correct: option `3` is the router/default gateway option and option `6` is the DNS server option per RFC 2132.
- `dhclient` is functional for this example, but ISC DHCP is legacy software and some Linux distributions now default to other clients such as `systemd-networkd`, `NetworkManager`, or `dhcpcd`. The post remains technically valid as written because it explicitly uses `dhclient`.
