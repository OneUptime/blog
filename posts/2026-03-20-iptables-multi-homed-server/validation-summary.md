# Validation Summary: How to Configure iptables for a Multi-Homed Linux Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- Linux netfilter packet filtering
- IPv4 forwarding with `sysctl`
- IPv4 NAT with `MASQUERADE`
- Multi-interface Linux routing/firewall policy

## Sources Consulted
- Netfilter iptables project page: https://www.netfilter.org/projects/iptables/index.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local `iptables(8)` man page from iptables 1.8.10
- Local `iptables-extensions(8)` man page from iptables 1.8.10
- Local `sysctl(8)` man page from procps-ng 4.0.4
- Local `iptables --help` and `iptables-translate -h` output

## Issues Found
- The post used `-m state --state ...` in multiple rules. I changed those matches to `-m conntrack --ctstate ...`, which is the current connection-tracking match documented in `iptables-extensions(8)`.
- The inter-LAN restriction example appended `DROP` rules after earlier broad `ACCEPT` rules, so the segmentation example would not take effect as written. It also appended the specific MySQL allow after the general drop, which would make that allow unreachable. I changed those commands to `-I FORWARD` with explicit positions so the service-specific allow is evaluated first and the restrictive rules take precedence over the broader inter-LAN allow rules shown earlier.
- The `OUTPUT` section appended an unconditional `ACCEPT` rule and then presented “restrict outbound” examples that would never restrict anything. I changed the allow-all example to use `-P OUTPUT ACCEPT`, and I corrected the restrictive example to use `-P OUTPUT DROP` plus explicit allow rules for `lo`, `eth0`, `eth1`, and `eth2`.

## Review Notes
- The post is IPv4-specific. Equivalent IPv6 filtering/forwarding would require separate `ip6tables` or `nftables` rules.
- The commands shown are runtime changes. Persisting them across reboot is distribution-specific and is not covered in the post.
- `iptables` remains usable and the commands are valid, but `nftables` is the modern successor in the Netfilter project.
