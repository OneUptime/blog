# Validation Summary: How to Configure Ubuntu Server for IPv6-Only Networking During Install

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server (Subiquity installer)
- IPv6 networking (SLAAC, DHCPv6, NAT64, DNS64, 464XLAT)
- Netplan (v2 YAML configuration)
- systemd-networkd
- APT (`Acquire::ForceIPv6`)
- OpenSSH (sshd `ListenAddress`)
- UFW / ip6tables
- Docker daemon IPv6 configuration
- curl / wget / ping6 / traceroute6 / `ip -6` utilities

## Sources Consulted
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Subiquity autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- RFC 6052 (well-known prefix `64:ff9b::/96` for IPv4/IPv6 translation)
- RFC 6146 (NAT64), RFC 6147 (DNS64), RFC 6877 (464XLAT)
- RFC 4193 (ULA `fc00::/7`), RFC 4291 (IPv6 addressing architecture)
- RFC 7217 (Semantically Opaque Interface Identifiers for SLAAC)
- Docker docs: https://docs.docker.com/engine/daemon/ipv6/ (and Engine v27/v28 release notes for `ip6tables` daemon option)
- APT manual: `Acquire::ForceIPv6` configuration option
- UFW: `/etc/default/ufw` `IPV6=yes` setting
- Linux kernel `bindv6only` sysctl docs and `ipv6(7)` manpage

## Issues Found
1. **Subiquity IPv6 method options were misstated.** The post listed "DHCPv6" and "Automatic (SLAAC)" as selectable methods in the installer. Subiquity actually exposes only three methods: "Automatic", "Manual", and "Disabled". "Automatic" handles SLAAC and DHCPv6 transparently based on the router advertisement `M`/`O` flags — there is no separate "DHCPv6" entry. Rewrote the step to say "Set method to 'Automatic'" and added a sentence clarifying that the installer has three methods and that Automatic covers both SLAAC and DHCPv6.
2. **Incorrect claim that `::0` means "all interfaces" distinct from `::`.** The original text wrote "rather than `::` (all IPv6 interfaces) or `::0` (all interfaces)", implying `::0` is a third address that listens on both IPv4 and IPv6. `::` and `::0` are identical — both are the IPv6 unspecified/wildcard address. Dual-stack acceptance of IPv4-mapped addresses is governed by the `IPV6_V6ONLY` socket option (Linux default off via `net.ipv6.bindv6only=0`), not by the textual form of the bind address. Rewrote the sentence to note that `::0` is just an alternate notation for `::`.
3. **SLAAC interface identifier description was outdated.** The post said SLAAC derives the address "from the router advertisement prefix and the interface's MAC address". Modern Linux (and Ubuntu) defaults to RFC 7217 stable privacy addresses, not EUI-64 MAC-derived identifiers. Reworded to mention that the interface identifier is historically EUI-64/MAC-derived but modern Linux defaults to RFC 7217 stable privacy addresses.

## Review Notes
- `ping6` and `traceroute6` still work on current Ubuntu (iputils provides them as wrappers/symlinks), but the modern preferred forms are `ping -6` and `traceroute -6`. Kept the post's usage as is since it is unambiguous and the commands continue to function.
- The Docker `daemon.json` example uses `"ip6tables": true`. This option exists since Docker 20.10 (experimental) and became fully supported / default-on in Docker Engine 27 (mid-2024). For Ubuntu Server in 2026 this is the correct setting; readers on older Docker versions may need to add the daemon flag `--experimental` or upgrade.
- `fixed-cidr-v6: "fd00::/64"` uses a ULA prefix; this is fine for the illustrative example, though for publicly reachable containers a routable global unicast prefix delegated by the upstream is preferred.
- The post mentions `/proc/sys/net/ipv6/bindv6only`; this is correct (sysctl name `net.ipv6.bindv6only`).
- The Netplan `routes: - to: default` syntax is the modern v2 form (replacing the deprecated `gateway6:` key) and is correct.
- All cited public IPv6 DNS addresses (`2001:4860:4860::8888` for Google, `2606:4700:4700::1111` for Cloudflare) are correct.
