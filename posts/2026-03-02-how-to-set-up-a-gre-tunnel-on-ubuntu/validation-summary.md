# Validation Summary: How to Set Up a GRE Tunnel on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- GRE (Generic Routing Encapsulation) tunnels
- Ubuntu Linux
- `iproute2` (`ip tunnel`, `ip link`, `ip addr`, `ip route`)
- Linux IP forwarding (`sysctl net.ipv4.ip_forward`)
- iptables (filter rules, `iptables-save`)
- nftables
- Netplan (tunnels stanza)
- systemd-networkd (`.netdev` and `.network` units)
- systemd service units
- tcpdump (GRE capture)
- ICMP / `ping` MTU probing

## Sources Consulted
- iproute2 `ip-tunnel(8)` manual — tunnel creation syntax, `mode gre`, `local`, `remote`, `ttl`, `dev`
- `ip-link(8)` and `ip-address(8)` — interface and address management
- RFC 2784 (Generic Routing Encapsulation) — GRE header format and 24-byte encapsulation overhead (20-byte outer IPv4 + 4-byte basic GRE header)
- Linux kernel networking documentation — `net.ipv4.ip_forward` semantics and `/etc/sysctl.d/` persistence
- systemd.netdev(5) manual — `[NetDev]`, `[Tunnel]` sections, `Independent=`, `Kind=gre`
- systemd.network(5) manual — `[Match]`, `[Network]`, `[Route]` semantics
- Netplan reference (canonical.com) — `tunnels:` schema, `mode: gre`, `local`, `remote`, `addresses`, `routes`, `mtu`
- nftables wiki — named priorities (`priority filter`), `ip protocol`, hooks
- iptables manual — `-p gre`, `FORWARD` chain semantics, `iptables-persistent` (`/etc/iptables/rules.v4`)
- ping(8) — `-M do` (Path-MTU disable-fragmentation) and `-s` payload size semantics
- IANA IP Protocol Numbers — GRE assigned to protocol number 47
- tcpdump pcap-filter(7) — `proto` primitive

## Issues Found

1. **Broken line continuation with inline comments in `ip tunnel add` commands (both Server A and Server B blocks).** The original code placed `# comment` text after the `\` line-continuation backslash on the same line, e.g. `local 203.0.113.1 \     # This server's public IP`. In bash, the `\` only escapes the next character; when followed by whitespace and then `#`, the `#` starts an end-of-line comment, so the newline is NOT escaped and the multi-line command is broken at that point. Verified with `bash -c 'echo hello \   # comment\nworld'` which produces `bash: line 2: world: command not found`. **Fix:** moved the per-flag annotations into comment lines above the command and removed the in-line `# ...` annotations so the `\` continuations are now bash-valid.

2. **systemd-networkd GRE netdev missing `Independent=yes`.** Per systemd.netdev(5), when `Independent=` defaults to `no`, the tunnel must be bound to an underlying interface (typically by adding `Tunnel=gre1` to the physical interface's `.network` file). The post does not show that binding — only a `.network` for `gre1` itself — so the example would not bring up a working tunnel on a fresh system. **Fix:** added `Independent=yes` to the `[Tunnel]` section so the netdev/network pair is self-contained, matching the rest of the post's standalone-script style.

## Review Notes
- The 24-byte GRE encapsulation overhead (20 outer-IPv4 + 4 basic GRE) and the resulting 1476-byte inner MTU on a 1500-byte path are correct per RFC 2784.
- The `tcpdump -i eth0 proto gre -n` filter relies on libpcap recognising the `gre` protocol name. This works on modern libpcap (Ubuntu 20.04+) but is not in the historically documented list of names for the `proto` primitive (icmp, igmp, igrp, pim, ah, esp, vrrp, udp, tcp). If a user hits a syntax error on an older system, `proto 47` is the safer equivalent. Left as-is because the post targets modern Ubuntu where it works.
- The `ping -M do -s 1450` example payload sizes are slightly above the 1448-byte threshold that fits a 1476-MTU tunnel without fragmentation, but the post explicitly tells the reader to "adjust up/down to find limit", which is the standard PMTU probing pattern — not an error.
- The post's description claims "static and dynamic routing through the tunnel" but only static routing (`ip route add`) is demonstrated. Not a technical error in the body; consider updating the description (or adding a brief BGP/OSPF-over-GRE pointer) in a future revision.
- GRE Tunnel Limitations section correctly notes the lack of encryption, authentication, and built-in keepalives. The "no built-in keepalive" claim is accurate for the standard Linux GRE driver (Cisco's optional GRE keepalive extension is not implemented in mainline `iproute2`).
- Named priorities in nftables (`priority filter`) require nftables ≥ 0.9.0, which matches the stated "Ubuntu 20.04+" requirement.
