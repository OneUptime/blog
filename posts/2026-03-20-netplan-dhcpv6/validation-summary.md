# Validation Summary: How to Configure DHCPv6 with Netplan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool for Ubuntu/Debian)
- DHCPv6 (Dynamic Host Configuration Protocol for IPv6)
- SLAAC (Stateless Address Autoconfiguration)
- Router Advertisements (RAs)
- IPv6 Privacy Extensions (RFC 4941)
- systemd-networkd
- iproute2 (`ip` command)
- sysctl (kernel networking parameters)

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan try documentation: https://netplan.readthedocs.io/en/stable/netplan-try/
- Netplan tutorial: https://netplan.readthedocs.io/en/stable/netplan-tutorial/
- Linux kernel IPv6 sysctl documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- RFC 4941 (IPv6 Privacy Extensions)

## Issues Found
1. **Missing values in "Netplan File Location" section (line 21)**: The sentence read "Netplan configuration files are in  with  extension." with two empty placeholders. Fixed to "Netplan configuration files are in `/etc/netplan/` with `.yaml` extension."
2. **Awkward title duplication in Conclusion (line 144)**: The conclusion read "How to Configure DHCPv6 with Netplan with Netplan uses clean YAML syntax." Fixed to "Configuring DHCPv6 with Netplan uses clean YAML syntax." to remove the redundant title fragment.

## Review Notes
- All Netplan YAML keys (`dhcp6`, `accept-ra`, `ipv6-privacy`, `addresses`, `routes`, `nameservers`, `dhcp6-overrides`, `use-dns`, `use-domains`) verified valid and non-deprecated against official Netplan reference.
- The 120-second default rollback timeout for `netplan try` is correct.
- The `sysctl net.ipv6.conf.eth0.use_tempaddr` value of `2` (prefer temporary addresses) is accurate per the Linux kernel networking documentation.
- Note for future readers: when both `dhcp4` and `dhcp6` are enabled under the `networkd` backend, `dhcp4-overrides` and `dhcp6-overrides` must contain matching keys/values — not raised by the post but worth being aware of.
- `ping6` still works on most distros but is deprecated in favor of `ping -6` (or `ping` against an IPv6 address) on newer iputils versions; left as-is since `ping6` still functions on the supported Ubuntu/Debian releases.
- The `accept-ra` documentation notes that setting it alone is insufficient to bring up the interface — the post's examples always combine it with `dhcp6` or other config, so this is implicitly addressed.
