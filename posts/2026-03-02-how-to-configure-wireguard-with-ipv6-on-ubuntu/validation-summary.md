# Validation Summary: How to Configure WireGuard with IPv6 on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- WireGuard
- IPv6
- IPv4 and IPv6 routing
- iptables and ip6tables
- UFW
- sysctl

## Sources Consulted
- WireGuard wg-quick(8) manual: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- WireGuard wg(8) manual: https://man7.org/linux/man-pages/man8/wg.8.html
- Ubuntu wg(8) manual: https://manpages.ubuntu.com/manpages/resolute/man8/wg.8.html
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- Ubuntu Server WireGuard VPN documentation: https://ubuntu.com/server/docs/how-to/wireguard-vpn/
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- UFW framework manual: https://manpages.debian.org/testing/ufw/ufw-framework.8.en.html
- Local sysctl.conf(5) manual page
- Local iptables/ip6tables version checks

## Issues Found
- The ULA section described `fd00::/8` as the ULA prefix. RFC 4193 defines the overall ULA range as `fc00::/7`, with locally assigned ULAs using `fd00::/8`. Updated the wording to make that distinction clear.
- The client endpoint comment said the endpoint can be an IPv4 or IPv6 address but did not note WireGuard's bracket syntax for IPv6 endpoints. Updated the comment to mention `host:port` for IPv4 and `[host]:port` for IPv6.
- The UFW example placed an IPv6 NAT rule in `/etc/ufw/before.rules`, which is the IPv4 rules file. UFW evaluates IPv6 rules from `/etc/ufw/before6.rules`, so the example now separates the IPv4 and IPv6 masquerade snippets.

## Review Notes
The WireGuard configuration keys, `wg genkey`/`wg pubkey` usage, `wg show` fields, `wg-quick` `Address`, `DNS`, `PostUp`, and `PostDown` fields, sysctl syntax, and keepalive guidance were consistent with the consulted manuals. The IPv6 NAT66 approach is technically possible but should only be used when the server has working outbound IPv6; using a provider-routed IPv6 prefix is usually cleaner when available.
