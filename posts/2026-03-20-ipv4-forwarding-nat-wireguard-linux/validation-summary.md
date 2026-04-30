# Validation Summary: How to Enable IPv4 Forwarding and NAT for WireGuard on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- WireGuard
- wg-quick
- Linux kernel networking
- IPv4 forwarding
- iptables
- nftables
- conntrack

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- WireGuard `wg-quick(8)` documentation: https://git.zx2c4.com/wireguard-tools/tree/src/man/wg-quick.8
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `sysctl(8)` Linux manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- `netfilter-persistent(8)` Debian man page: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html
- Netfilter `nftables` man page: https://netfilter.org/projects/nftables/manpage.html
- nftables NAT documentation: https://wiki.netfilter.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html
- Red Hat iptables persistence guidance: https://access.redhat.com/solutions/7049833

## Issues Found
- The opening explanation implied NAT is required for any routed WireGuard deployment. I corrected this to the narrower and accurate case discussed by the post: providing internet access through the server.
- The interface-detection command parsed a fixed field from `ip route get` output, which is not robust across output variants. I changed it to extract the token following `dev`.
- The `PostUp`, `PostDown`, and `%i` explanation treated them as generic WireGuard config features. I corrected this to `wg-quick`, which is the tool that supports those keys and substitutions.
- The RHEL/CentOS persistence example used `service iptables save` without clarifying its legacy/service-specific context. I replaced it with `iptables-save | tee /etc/sysconfig/iptables` and scoped it to systems using `iptables-services`.
- The verification example paired `ping 8.8.8.8` with `conntrack -E -p udp`, which does not match the ICMP traffic being tested. I changed it to `conntrack -E`.
- The nftables section only added a NAT rule and omitted the forwarding rules that are also required when replacing the iptables example. I added equivalent nftables forward-chain and masquerade commands.
- The conclusion implied NAT is required for access to all private networks behind the server. I corrected it to note that private networks also need a return route through the server.

## Review Notes
- The iptables examples are functionally valid, but they are broad accept rules on the `FORWARD` chain. A tighter production firewall would usually restrict traffic directionally and often use connection-state matching.
- Many modern distributions use nftables or a compatibility layer behind `iptables`; the post is still valid, but the nftables alternative is increasingly the more native approach.
