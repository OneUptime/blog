# Validation Summary: How to Set Up GRE Tunnel Between Linux and a Cisco Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux GRE tunnels
- Cisco IOS GRE tunnels
- `iproute2`
- `iptables`
- Generic Routing Encapsulation (GRE)
- IPv4 routing and MTU/PMTU behavior

## Sources Consulted
- RFC 2784: Generic Routing Encapsulation (GRE) — https://www.rfc-editor.org/rfc/rfc2784
- RFC 2890: Key and Sequence Number Extensions to GRE — https://www.rfc-editor.org/rfc/rfc2890
- `ip-tunnel(8)` Linux manual page — https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `systemd.netdev(5)` Linux manual page — https://www.man7.org/linux/man-pages/man5/systemd.netdev.5.html
- Cisco IOS tunnel configuration guide ("Implementing Tunnels") — https://www.cisco.com/c/en/us/td/docs/ios/12_4/interface/configuration/guide/inb_tun.html
- Cisco IOS command reference for `tunnel source`, `tunnel destination`, `tunnel key`, and `tunnel mode` — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/command/ir-cr-book/ir-t2.html
- Cisco support article on GRE MTU and PMTUD behavior — https://www.cisco.com/c/en/us/support/docs/ip/generic-routing-encapsulation-gre/25885-pmtud-ipfrag.html
- Linux kernel IP sysctl documentation (`net.ipv4.ip_forward`) — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The Linux example created a tunnel named `gre0`. On Linux, `gre0` is a kernel-created fallback GRE device name and should not be used for a custom tunnel. I changed the example to use `gre1` consistently.
- The topology labeled `10.0.0.1` and `10.0.0.2` as "Public IP". Those are RFC 1918 private addresses, so I changed the label to "Underlay IP".
- The section heading "Optional but Recommended" for the GRE key overstated the recommendation. GRE keys are used for identification/discrimination, not as a general security recommendation, so I changed the heading to "Optional".
- The traceroute example showed fixed hop-by-hop output as if it were deterministic. Actual traceroute output varies by platform, ICMP source selection, and routing behavior, so I replaced it with accurate guidance instead of hard-coded output.
- The MTU troubleshooting row treated `1476` as a universal fix. That value is a common plain-GRE-over-IPv4 case on a 1500-byte path, but MTU handling depends on encapsulation overhead and PMTU. I changed the guidance to describe it correctly.

## Review Notes
- The `iptables` commands are syntactically correct, but some modern Linux distributions use nftables or firewalld underneath. The post is still technically valid because the `iptables` CLI remains widely available.
- `sysctl -w net.ipv4.ip_forward=1` enables forwarding only for the current runtime session. Persistence across reboots is outside the scope of this post.
