# Validation Summary: How to Apply and Test Netplan IPv6 Changes Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool)
- systemd-networkd (Netplan renderer)
- IPv6 (DHCPv6, SLAAC, RFC 4941 privacy extensions)
- Ubuntu / Debian
- iproute2 (`ip -6`)
- ICMPv6 (`ping6`)
- sysctl (kernel IPv6 settings)

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan CLI reference (`netplan try`, `netplan generate`, `netplan apply`): https://netplan.readthedocs.io/en/stable/reference/
- RFC 4941 — IPv6 Privacy Extensions: https://datatracker.ietf.org/doc/html/rfc4941
- Linux kernel IPv6 sysctl docs (`use_tempaddr`): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- systemd-networkd documentation: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- iproute2 man pages (`ip-address`, `ip-route`)

## Issues Found
- Line 21 had missing inline-code placeholders: "Netplan configuration files are in  with  extension." — the path and file extension were absent. Updated to "Netplan configuration files are in `/etc/netplan/` with `.yaml` extension." This matches Netplan's documented configuration directory and the supported file extension.

## Review Notes
- All Netplan YAML keys used (`dhcp6`, `accept-ra`, `ipv6-privacy`, `addresses`, `routes`, `nameservers.addresses`, `dhcp6-overrides.use-dns`, `dhcp6-overrides.use-domains`) are valid per the Netplan reference.
- `netplan try` does default to a 120-second confirmation timeout before rolling back, as stated.
- `sysctl net.ipv6.conf.<iface>.use_tempaddr = 2` correctly corresponds to "prefer temporary addresses" per kernel docs.
- `ping6` is deprecated on modern iputils in favor of `ping -6 <host>`, but remains available on Ubuntu 18.04+ / Debian 10+ (the post's stated target). Not a correctness issue, but worth noting for future updates.
- Example IPv6 addresses use the `2001:db8::/32` documentation prefix (RFC 3849) appropriately.
