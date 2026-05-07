# Validation Summary: How to Configure 6in4 Manual Tunnels on Linux

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPv6
- 6in4 / configured IPv6-over-IPv4 tunnels
- SIT tunnels on Linux
- iproute2 (`ip tunnel`, `ip addr`, `ip route`)
- systemd-networkd
- ifupdown (`/etc/network/interfaces`)
- Linux firewalling with iptables/ip6tables

## Sources Consulted
- RFC 4213, "Basic Transition Mechanisms for IPv6 Hosts and Routers": https://www.rfc-editor.org/rfc/rfc4213.html
- systemd.netdev(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.network(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- interfaces(5) for ifupdown (Debian bookworm): https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Hurricane Electric IPv6 FAQ (point-to-point tunnel /64 vs routed /64 or /48): https://ipv6.he.net/certification/faq.php
- Linux kernel IP sysctl documentation (`net.ipv6.conf.all.forwarding`): https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Local man pages consulted in the workspace: `man ip-tunnel`, `man systemd.netdev`, `man systemd.network`, `man iptables-extensions`

## Issues Found
- The traceroute comment implied the tunnel itself is traceable. RFC 4213 models configured IPv6-over-IPv4 tunnels as a single hop and opaque to traceroute, so the comment was corrected to describe tracing to an external IPv6 host over the tunnel.
- The `/etc/network/interfaces` example used `netmask 64`, which current ifupdown documentation marks as deprecated for `v4tunnel`. It was replaced with CIDR notation in the `address` field.
- The same `ifupdown` stanza mixed the built-in `v4tunnel` method with separate manual `up`/`down` tunnel creation commands. That would duplicate configuration if copied as-is, so the conflicting manual commands were removed.
- The `/48` section incorrectly used the routed prefix as a `/128` tunnel-interface address and host route. Tunnel brokers typically provide a separate point-to-point tunnel /64 and route the extra /48 behind it. The example was corrected to use a tunnel /64, a default route via the broker's tunnel address, and LAN /64s carved from the routed /48.
- The LAN-prefix section implied that starting `radvd` alone was sufficient. The example was corrected to show that IPv6 forwarding must be enabled and to phrase router advertisement setup as configuration, not a one-line launch command.

## Review Notes
- The firewall examples are technically valid, but newer Linux systems may use `nftables` or the `iptables-nft` compatibility layer by default.
- The `/etc/network/interfaces` section applies to ifupdown-based systems; newer Ubuntu installs often default to netplan instead.
