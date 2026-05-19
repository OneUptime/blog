# Validation Summary: How to Configure IP Forwarding and Enable Routing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux IP forwarding
- sysctl
- iproute2 routing commands
- Netplan
- iptables / xtables
- Docker networking
- LXC / KVM networking
- Reverse path filtering

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Netplan YAML configuration documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Docker packet filtering and firewall documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker with iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/
- iptables extensions manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local command help: `sysctl --help`, `ip route help`, `iptables --help`, `netplan --help`, `xtables-monitor --help`

## Issues Found
- Docker forwarding behavior was too broad. The post said Docker enables IP forwarding automatically, but Docker's official documentation distinguishes the iptables backend from the nftables backend. Updated the wording to say Docker enables forwarding automatically when using the iptables backend, while the nftables backend requires forwarding to be enabled separately when needed.
- The per-interface IPv4 forwarding example incorrectly implied that `net.ipv4.conf.eth0.forwarding=1` would remain effective after setting `net.ipv4.ip_forward=0`. The Linux kernel documentation notes that changing `net.ipv4.ip_forward` resets forwarding-related configuration to host or router defaults. Replaced that command with a verification command and added a note explaining the behavior.
- The iptables `TRACE` debugging example assumed kernel journal output and used an `OUTPUT` trace rule for traffic that was being discussed as forwarded traffic. The iptables extensions documentation says the nft backend exposes trace events through `xtables-monitor --trace`. Updated the example to trace matching forwarded packets in `PREROUTING` and read trace output with `xtables-monitor --trace`.

## Review Notes
- The Netplan `routes` examples use current `routes: - to: default` syntax and are consistent with Netplan documentation.
- The post uses iptables examples, which remain supported on Ubuntu, but many current Ubuntu systems use the iptables-nft backend. Future revisions could add equivalent nftables examples.
- The post references `conntrack`; on minimal systems this may require installing the `conntrack` package.
