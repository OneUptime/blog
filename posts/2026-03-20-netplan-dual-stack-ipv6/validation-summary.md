# Validation Summary: How to Configure Dual-Stack with Netplan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML network configuration)
- Ubuntu / Debian
- IPv6 (DHCPv6, SLAAC, RFC 4941/8981 privacy extensions)
- IPv4 (DHCPv4)
- systemd-networkd
- iproute2 (`ip -6 addr`, `ip -6 route`)
- `sysctl` IPv6 kernel tunables

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Ubuntu manpage: netplan-apply — https://manpages.ubuntu.com/manpages/jammy/man8/netplan-apply.8.html
- Ubuntu manpage: netplan-try — https://manpages.ubuntu.com/manpages/jammy/man8/netplan-try.8.html
- Ubuntu manpage: netplan-generate — https://manpages.ubuntu.com/manpages/focal/man8/netplan-generate.8.html
- RFC 4941 / RFC 8981 (IPv6 Privacy Extensions / Temporary Addresses)
- sysctl-explorer: net.ipv6.conf.*.use_tempaddr — https://sysctl-explorer.net/net/ipv6/use_tempaddr/

## Issues Found
1. **Missing values in "Netplan File Location" paragraph** — The sentence read "Netplan configuration files are in  with  extension." with empty placeholders. Replaced with the correct path `/etc/netplan/` and extension `.yaml`.
2. **First "Configuration Example" not actually dual-stack** — The post is titled "How to Configure Dual-Stack with Netplan" but the primary example only configured IPv6 (no `dhcp4` or static IPv4). Added `dhcp4: true` to make the example a true dual-stack configuration consistent with the post's title.
3. **Duplicate phrase in conclusion** — "How to Configure Dual-Stack with Netplan with Netplan uses clean YAML syntax." Fixed the duplicated "with Netplan" wording to "Configuring dual-stack with Netplan uses clean YAML syntax."

## Review Notes
- All Netplan YAML keys (`dhcp6`, `accept-ra`, `ipv6-privacy`, `dhcp6-overrides`, `addresses`, `routes`, `nameservers`) are valid per the official Netplan reference.
- `netplan try` correctly defaults to a 120-second rollback window.
- `netplan --debug apply` (flag before subcommand) is the correct invocation; the post uses this correct form.
- `sysctl net.ipv6.conf.<iface>.use_tempaddr = 2` correctly indicates "prefer temporary addresses" (RFC 8981, which obsoletes RFC 4941). The post still cites RFC 4941, which is acceptable but readers may want to be aware that RFC 8981 is the current spec.
- `ping6` is deprecated on modern distributions in favor of `ping -6` (or just `ping <ipv6-addr>`), having been merged into the unified `ping` binary in iputils v20150815+. The command still works on most current systems, so it was left in place, but newer documentation typically prefers `ping -6`.
