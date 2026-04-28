# Validation Summary: How to Configure IPv6 Privacy Extensions with Netplan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool)
- systemd-networkd (renderer)
- IPv6 (SLAAC, DHCPv6, Router Advertisements)
- RFC 4941 IPv6 Privacy Extensions
- Linux kernel sysctl (`net.ipv6.conf.<iface>.use_tempaddr`)
- iproute2 (`ip -6 addr`, `ip -6 route`)
- Ubuntu / Debian

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (verified `ipv6-privacy`, `accept-ra`, `dhcp6`, `dhcp6-overrides`, `addresses`, `routes`, `nameservers`)
- Netplan CLI documentation: https://netplan.readthedocs.io/en/stable/netplan/ (verified `netplan generate`, `netplan try`, `netplan apply`, and `--debug` flag)
- RFC 4941 — IPv6 Privacy Extensions for Stateless Address Autoconfiguration
- Linux kernel networking docs: `Documentation/networking/ip-sysctl.rst` (verified `use_tempaddr` semantics: 0=disabled, 1=enabled, 2=prefer temporary)
- systemd-networkd documentation: `IPv6PrivacyExtensions=` directive (which Netplan emits when `ipv6-privacy: true` is set)
- iproute2 manpages for `ip-address(8)` (verified `temporary`/`mngtmpaddr` flag output)

## Issues Found
1. **Missing path and extension in "Netplan File Location" section.** The sentence read: "Netplan configuration files are in  with  extension." Two values had been dropped from the template. Replaced with: "Netplan configuration files are in `/etc/netplan/` with `.yaml` extension." This matches the path used in the subsequent commands and the official Netplan documentation.
2. **Duplicated phrase in conclusion.** The first sentence read: "How to Configure IPv6 Privacy Extensions with Netplan with Netplan uses clean YAML syntax." This was clearly a templating artifact (the title concatenated with the actual sentence). Rewrote to: "Configuring IPv6 privacy extensions with Netplan uses clean YAML syntax."

## Review Notes
- `ipv6-privacy: true` is a valid Netplan option and is documented in the Netplan YAML reference. With the `networkd` renderer it is translated to `IPv6PrivacyExtensions=yes` in the generated systemd-networkd unit.
- `ping6` still works on most modern distros but has been formally superseded by `ping -6` (iputils merged the binaries). Not incorrect, just slightly old-style — left as-is to preserve author voice.
- The `use_tempaddr` sysctl values cited (2 = prefer temporary) match the kernel documentation.
- The example `temporary dynamic` and `mngtmpaddr noprefixroute` flags shown in `ip -6 addr` output are accurate for an interface with privacy extensions and SLAAC enabled.
- `dhcp6-overrides.use-dns` and `use-domains` are both valid Netplan keys.
- None of the configuration snippets contain syntax errors; YAML indentation is consistent throughout.
