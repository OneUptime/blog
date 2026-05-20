# Validation Summary: How to Configure Split Tunneling with WireGuard on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- WireGuard
- wg-quick
- Linux routing and policy routing
- iproute2
- iptables
- cgroups
- systemd-resolved / resolvectl

## Sources Consulted
- WireGuard wg(8) manual: https://man7.org/linux/man-pages/man8/wg.8.html
- WireGuard wg-quick(8) manual: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- Linux ip-rule(8) manual: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- iptables-extensions(8) manual: https://man.archlinux.org/man/iptables-extensions.8.en
- systemd resolvectl(1) manual: https://www.freedesktop.org/software/systemd/man/resolvectl.html
- Local command help for `ip rule`, `ip route`, and `resolvectl`

## Issues Found
- The post showed `AllowedIPs = 0.0.0.0/1, 128.0.0.0/1` as an example for routing everything except `192.168.1.0/24`. That pair is just a full IPv4 default route split into two halves and does not exclude the subnet. Updated the example to show a partial complementary CIDR list and explicitly state that the full generated list must exclude `192.168.1.0/24`.
- The post implied `wg-quick` automatically calculates exclusion CIDRs. Official `wg-quick` documentation says it infers and adds routes from configured peer `AllowedIPs`; it does not compute CIDR holes. Removed that claim and clarified that a calculator is needed.
- The policy-routing example marked traffic but did not mention that WireGuard `AllowedIPs` must still permit those marked destinations. Added a note that broad `AllowedIPs`, usually with `Table = off` or a custom `Table`, are required for this pattern.
- The cgroup example used the cgroup v1 `net_cls` controller without noting that modern Ubuntu systems commonly use cgroup v2. Added a cgroup-v1 caveat and pointed readers toward the iptables cgroup `--path` matcher or another cgroup-v2-aware workflow for unified hierarchy systems.
- The troubleshooting section referred to a server pushing an OpenVPN-style `redirect-gateway` directive. WireGuard has no such push directive. Updated the text to direct readers to inspect local routes created from the client configuration.

## Review Notes
The core explanation of WireGuard `AllowedIPs`, `PersistentKeepalive`, `wg-quick` route inference, `Table`, `PostUp` / `PreDown`, iproute2 policy rules, iptables owner matching, and systemd-resolved route-only domains is technically consistent with the referenced documentation after the fixes above. Future improvements could include a complete generated CIDR exclusion example or a dedicated cgroup v2 example, but those would be expansions rather than corrections.
