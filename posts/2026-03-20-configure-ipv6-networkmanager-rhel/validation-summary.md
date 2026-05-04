# Validation Summary: How to Configure IPv6 with NetworkManager on RHEL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 (addressing, SLAAC, DHCPv6, privacy extensions, routing)
- NetworkManager (RHEL's default network management daemon)
- nmcli (NetworkManager command-line interface)
- nmtui (NetworkManager text UI)
- Red Hat Enterprise Linux (RHEL 7+)
- iproute2 (`ip -6 addr`, `ip -6 route`)
- iputils (`ping6`)
- NetworkManager keyfile format (`.nmconnection` files)

## Sources Consulted
- NetworkManager nmcli reference: https://networkmanager.dev/docs/api/latest/nmcli.html
- nm-settings-nmcli (IPv6 properties): https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager keyfile format: https://networkmanager.dev/docs/api/latest/nm-settings-keyfile.html
- Red Hat documentation: "Configuring and managing networking" (RHEL 9): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/
- Red Hat: Configuring an IPv6 connection by using nmcli
- RFC 4862 (IPv6 SLAAC), RFC 8415 (DHCPv6), RFC 4941/8981 (Privacy Extensions)
- NM_SETTING_IP6_CONFIG_PRIVACY enum (NetworkManager source)
- IANA IPv6 documentation prefix `2001:db8::/32` (RFC 3849)

## Issues Found
1. **Invalid IPv6 address in `ipv6.routes` example** — The original example used `"2001:db8:remote::/48 2001:db8::gateway"`. The string `gateway` is not valid hexadecimal, so `2001:db8::gateway` is not a parseable IPv6 address and the command would fail. Replaced the placeholder next-hop with `2001:db8::1` so the example is syntactically valid while still using the documentation prefix.

## Review Notes
- The keyfile path `/etc/NetworkManager/system-connections/` and the `.nmconnection` extension are correct for systems using the keyfile plugin. This is the default storage format on RHEL 9+; on RHEL 7 and 8, the legacy `ifcfg` format under `/etc/sysconfig/network-scripts/` is the default unless the `keyfile` plugin has been enabled. Readers on older RHEL versions may need to migrate connections (e.g., `nmcli connection migrate`) to find them at this path. This is a version-specific caveat rather than an error.
- `ping6` is still available on RHEL but has been superseded by the unified `ping` command in modern iputils; `ping 2001:4860:4860::8888` works equivalently. Not incorrect — just worth noting for future updates.
- The `ipv6.ip6-privacy` enum values (-1, 0, 1, 2) match the `NMSettingIP6ConfigPrivacy` definition in NetworkManager and are accurate.
- `ipv6.method` accepted values (`auto`, `manual`, `dhcp`, `disabled`, plus `ignore`, `link-local`, `shared`, `disabled` not all covered) are correct; the post covers the four most common ones.
- `ipv6.ignore-auto-dns no` correctly accepts DNS from RA/DHCPv6 (the property is a boolean and `no` means "do not ignore").
- Multi-address syntax with comma-separated CIDR values inside the `ipv6.addresses` string is the standard nmcli form and works as shown.
- All example addresses use the `2001:db8::/32` documentation prefix, which is the correct convention per RFC 3849.
