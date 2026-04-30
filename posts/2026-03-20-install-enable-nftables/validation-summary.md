# Validation Summary: How to Install and Enable nftables on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- iptables / iptables-nft compatibility layer
- systemd
- Linux firewall configuration on Debian/Ubuntu and RHEL/CentOS

## Sources Consulted
- nftables wiki: Configuring chains - https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki: Matching packet headers - https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables wiki: Simple ruleset for a server - https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_server
- Ubuntu security documentation: nftables - https://documentation.ubuntu.com/security/security-features/network/firewall/nftables/
- Debian Wiki: nftables - https://wiki.debian.org/nftables
- Red Hat Enterprise Linux 7 Security Guide: Getting Started with nftables - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/chap-getting_started_with_nftables
- Red Hat Enterprise Linux 8 Securing networks: Getting started with nftables - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/getting-started-with-nftables_securing-networks
- Red Hat Enterprise Linux 8 Considerations in adopting RHEL 8: nftables replaces iptables as the default network packet filtering framework - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/networking_considerations-in-adopting-rhel-8
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Local CLI and man pages: `nft --help`, `nft --version`, `iptables --version`, `iptables-translate -A INPUT -p tcp --dport 22 -j ACCEPT`, `nft(8)`, `iptables-translate(8)`

## Issues Found
- The post treated `/etc/nftables.conf` as the persistence file for all distributions. That is correct for Debian/Ubuntu, but Red Hat documentation shows the `nftables` service loads scripts referenced from `/etc/sysconfig/nftables.conf`. I updated the post to distinguish Debian/Ubuntu from RHEL/CentOS and to show the Red Hat include-based persistence path.
- The `iptables` backend check used `iptables -L` with a note implying it would show the `nf_tables` backend. That is inaccurate. I changed the post to use `iptables --version`, which does show whether the backend is `nf_tables` or `legacy`.
- The conceptual mapping table implied an `iptables` built-in chain directly maps to a same-named nftables chain. Official nftables documentation is clearer: nftables uses base chains attached to hooks, and chain names are arbitrary. I corrected that row.
- The sample ruleset comment said `icmp type echo-request accept` allowed “ICMP (ping)” in an `inet` table. That rule only covers IPv4 ICMP. I corrected the comment and added the matching ICMPv6 allowance for neighbor discovery and echo requests so the dual-stack example is technically consistent.
- The `iptables-translate` example output omitted the `counter` expression. I updated the example to match the actual translator output.
- The conclusion stated Ubuntu 20.04+ uses the nftables backend by default. Ubuntu’s official security documentation says the `iptables` nft backend has been the default since Ubuntu 20.10. I corrected that version claim.

## Review Notes
- The sample ruleset is intentionally minimal. Real production deployments often add more service-specific rules and, for IPv6-heavy environments, may permit a broader set of ICMPv6 control traffic than this starter example.
