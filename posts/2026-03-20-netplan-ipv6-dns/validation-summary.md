# Validation Summary: How to Configure IPv6 DNS with Netplan

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Netplan (Ubuntu network configuration tool)
- IPv6 (DHCPv6, SLAAC, RFC 4941 privacy extensions)
- systemd-networkd (renderer)
- Linux `ip` command and `sysctl`
- DNS (Google Public DNS over IPv6: 2001:4860:4860::8888 / ::8844)

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Canonical Netplan examples: https://netplan.readthedocs.io/en/stable/examples/
- RFC 4941 — Privacy Extensions for Stateless Address Autoconfiguration in IPv6
- systemd-networkd documentation: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- Linux kernel networking docs (`net.ipv6.conf.*.use_tempaddr`): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Google Public DNS (IPv6 addresses): https://developers.google.com/speed/public-dns/docs/using

## Issues Found
1. **Missing template values in "Netplan File Location" section.** The text read: "Netplan configuration files are in  with  extension." — two placeholder values were dropped. Replaced with the correct values: `/etc/netplan/` for the path and `.yaml` for the extension. (Verified against Netplan documentation.)
2. **Duplicated phrase in conclusion.** The opening sentence read: "How to Configure IPv6 DNS with Netplan with Netplan uses clean YAML syntax." — clearly a templating duplication. Rewrote to: "Configuring IPv6 DNS with Netplan uses clean YAML syntax."

## Review Notes
- All Netplan YAML keys used are valid: `dhcp4`, `dhcp6`, `accept-ra`, `ipv6-privacy`, `addresses`, `routes` (with `to`/`via`), `nameservers.addresses`, `dhcp6-overrides` (with `use-dns`, `use-domains`).
- `netplan generate` does generate backend configuration files (and exits non-zero on YAML errors), so the comment "Validate YAML syntax" is approximate but acceptable.
- `netplan try` default rollback timeout is 120 seconds — correctly stated.
- `net.ipv6.conf.<iface>.use_tempaddr = 2` correctly means "prefer temporary addresses" (per kernel ip-sysctl.txt).
- `ping6` is deprecated on modern Ubuntu in favor of `ping` (which auto-selects the family) but remains available, so the example still works.
- Content scope caveat: the title is "How to Configure IPv6 DNS with Netplan" but the post covers broader IPv6 setup (SLAAC, DHCPv6, privacy extensions) with DNS being just one section. The `Systemd-resolved` tag is not directly addressed in the body. This is a scope/structure observation, not a technical inaccuracy.
- Google's IPv6 DNS resolvers `2001:4860:4860::8888` and `2001:4860:4860::8844` are correct.
