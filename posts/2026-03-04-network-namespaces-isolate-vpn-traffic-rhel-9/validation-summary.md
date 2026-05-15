# Validation Summary: How to Use Network Namespaces to Isolate VPN Traffic on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux network namespaces
- iproute2
- veth interfaces
- nftables
- WireGuard
- DNS resolver configuration for network namespaces

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Linux `ip-netns(8)` manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `network_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- WireGuard quick start: https://www.wireguard.com/quickstart/
- WireGuard `wg(8)` manual page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- WireGuard `wg-quick(8)` manual page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- Local command help/version checks for `ip`, `ip netns`, `ip link`, `nft`, and `iptables`

## Issues Found
- The RHEL 9 firewall examples used `iptables` rules for new NAT and forwarding setup. RHEL 9 documentation identifies `nftables` as the modern packet filtering framework and notes that the `iptables-nft` package is deprecated. I replaced the NAT, forwarding, cleanup, and troubleshooting commands with equivalent `nft` commands.
- The manual WireGuard setup passed `/etc/wireguard/wg0.conf` directly to `wg setconf`. A typical `wg-quick` config can contain fields such as `Address`, `DNS`, `Table`, `PostUp`, and `PreDown`, while `wg setconf` accepts only the lower-level `wg(8)` configuration format. I changed the command to pipe `wg-quick strip /etc/wireguard/wg0.conf` into `wg setconf`.

## Review Notes
The namespace, veth, route, DNS, and WireGuard concepts are technically sound. On RHEL systems where `firewalld` manages forwarding policy, the `nft` examples may still need to be adapted to the host's existing firewall ruleset to avoid conflicts with other active firewall management services.
