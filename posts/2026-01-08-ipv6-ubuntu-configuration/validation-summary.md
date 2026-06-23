# Validation Summary: How to Configure IPv6 Addressing on Ubuntu Servers

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- IPv6 addressing (RFC 4291 address types: GUA, link-local, ULA, multicast, loopback)
- Ubuntu Server networking
- Netplan (YAML network configuration)
- systemd-networkd backend
- SLAAC / DHCPv6 / Router Advertisements
- `ip`, `ifconfig`, `ping6`/`ping -6`, `traceroute6`, `dig`, `host`, `ss`, `netstat` utilities
- ip6tables and UFW firewalling
- VLANs and link bonding (802.3ad/LACP)

## Sources Consulted
- Netplan reference documentation — https://netplan.readthedocs.io/en/stable/netplan-yaml/ (verified keys: `addresses`, `routes` with `to: default`/`to: ::/0`, `accept-ra`, `ipv6-privacy`, `dhcp6`, `dhcp6-overrides` with `use-dns`/`use-domains`, `vlans`, `bonds` parameters `mode`/`lacp-rate`/`mii-monitor-interval`)
- Netplan CLI documentation — https://netplan.readthedocs.io/en/stable/netplan/ (verified `netplan generate`, `netplan try` 120s default timeout, `netplan apply`, and global `--debug` flag placement)
- RFC 4291 "IP Version 6 Addressing Architecture" — address ranges 2000::/3 (GUA), fe80::/10 (link-local), fc00::/7 (ULA), ::1/128 (loopback), ff02::1 / ff02::2 (multicast)
- RFC 3849 — 2001:db8::/32 documentation prefix; RFC 5737 — 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 documentation IPv4 ranges
- `ip6tables(8)`, `ufw` man pages and Google Public DNS docs (2001:4860:4860::8888 / ::8844)

## Issues Found
1. **Invalid IPv6 addresses in the "Multiple Interfaces" example** (formerly `2001:db8:public::10` / `2001:db8:public::1` / `fd00:private::10` / `fd00:private::1`). IPv6 addresses are hexadecimal, so the literal words `public` and `private` contain non-hex characters (`p`, `u`, `i`, `r`, `v`, `t`, etc.) and would be rejected by `netplan generate`/`systemd-networkd`. Replaced with valid hex while preserving the public/private labelling via the existing interface comments: `2001:db8:0::10/64` (gateway `2001:db8:0::1`) for the public interface and `fd00:abcd::10/64` (gateway `fd00:abcd::1`) for the private interface.
2. **Incorrect flag placement: `netplan generate --debug`** in the troubleshooting section. `--debug` is a global Netplan option and must precede the subcommand. Changed to `sudo netplan --debug generate`, matching the correct placement already used earlier in the post (`sudo netplan --debug apply`).

## Review Notes
- All other Netplan snippets are valid: `routes` use the modern `to:`/`via:` syntax (correctly avoiding the deprecated `gateway4`/`gateway6` keys), and `to: default`, `to: 0.0.0.0/0`, `to: ::/0` are all accepted forms.
- Address-type ranges, multicast scopes, and the `netplan try` 120-second rollback timeout are accurate.
- The GUA bit-field text diagram is a simplification (the interface-ID pointer sits one group early relative to the strict last-64-bits boundary), but it is illustrative and not technically wrong; left as-is to respect the author's style.
- `ifconfig`, `ping6`, `traceroute6`, and `netstat` are from the legacy `net-tools`/`iputils` packages and may not be installed by default on minimal modern Ubuntu; the post already provides the `ip`/`ping -6`/`traceroute -6`/`ss` equivalents alongside them, so no change needed.
