# Validation Summary: How to Debug Netplan IPv6 Configuration Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan
- IPv6 (DHCPv6, SLAAC, RFC 4941 privacy extensions)
- systemd-networkd
- Ubuntu / Debian
- iproute2 (`ip` command)
- sysctl (kernel IPv6 settings)
- journalctl

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan CLI reference (`netplan try`, `netplan apply`, `netplan generate`): https://netplan.readthedocs.io/en/stable/netplan/
- RFC 4941 — IPv6 Privacy Extensions for Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4941
- Linux kernel IPv6 sysctl docs (`use_tempaddr`): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- systemd-networkd manpage: https://www.freedesktop.org/software/systemd/man/systemd-networkd.html
- iproute2 `ip-address` manpage

## Issues Found
- **Missing placeholder values in "Netplan File Location" section**: The sentence read `Netplan configuration files are in  with  extension.` — two values had not been substituted into the template. Fixed to `Netplan configuration files are in `/etc/netplan/` with `.yaml` extension.` This matches the Netplan documentation (Netplan also accepts `.yml` but `.yaml` is the conventional and documented extension and is consistent with the file paths used elsewhere in the post).

## Review Notes
- Netplan YAML keys (`dhcp6`, `accept-ra`, `ipv6-privacy`, `addresses`, `routes` with `to`/`via`, `nameservers.addresses`, `dhcp6-overrides.use-dns`, `dhcp6-overrides.use-domains`) all match the official Netplan reference.
- `netplan try` default rollback timeout is 120 seconds — accurate.
- `sysctl net.ipv6.conf.eth0.use_tempaddr = 2` correctly corresponds to "prefer temporary addresses" per the kernel IPv6 docs.
- `mngtmpaddr` and `temporary` flags shown in the example `ip -6 addr show` output are real iproute2 flags for IPv6 privacy/temporary addresses.
- `ping6` is still available on Ubuntu 18.04+ but on more recent releases it is provided as a symlink/alias to `ping`; both will work.
- The post is a Netplan IPv6 quick-reference rather than a deep "debug" walkthrough — that is a content/scope observation, not a technical error.
