# Validation Summary: How to Configure IPv6 with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Netplan (YAML-based network configuration)
- Ubuntu (18.04+)
- systemd-networkd
- NetworkManager
- IPv6 (SLAAC, DHCPv6, static addressing, dual-stack)
- IPv6 Privacy Extensions (RFC 4941 / RFC 8981)
- Router Advertisements
- `ip`, `resolvectl`, `ping6`, `dig` utilities

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- `netplan get` documentation: https://netplan.readthedocs.io/en/stable/netplan-get/
- Canonical/Ubuntu Netplan examples and tutorials
- cloud-init issue #4031 (gateway4/gateway6 deprecation): https://github.com/canonical/cloud-init/issues/4031
- RFC 4941 (IPv6 Privacy Extensions, obsoleted by RFC 8981)

## Issues Found
1. **Deprecated `gateway4` / `gateway6` keys in the static IPv6 example.** These keys were deprecated in Netplan 0.103 (shipped with Ubuntu 22.04 LTS) and emit a warning at apply time: *"gateway4 has been deprecated, use default routes instead"*. Replaced both with the modern `routes:` form using `to: default` and `via:` entries, which is the syntax recommended by the official Netplan reference. Also added an inline comment noting the deprecation so readers understand why the syntax differs from older guides.

## Review Notes
- All other YAML keys (`accept-ra`, `dhcp6`, `dhcp6-overrides.use-dns`, `dhcp6-overrides.use-routes`, `ipv6-privacy`, `addresses`, `nameservers.addresses`, `routes.to/via`) are correct per the Netplan reference.
- `netplan --version`, `netplan get`, `netplan try` (with its 120s default revert), `netplan apply`, and `netplan --debug apply` are all valid commands.
- Verification commands (`ip -6 addr show`, `ip -6 route show`, `resolvectl status`, `ping6`, `dig AAAA`) are correct.
- RFC 4941 was obsoleted by RFC 8981 in 2021, but the Netplan reference itself still cites RFC 4941 for the `ipv6-privacy` option, so the post's reference is consistent with upstream documentation. No change needed.
- `ping6` is the legacy command name; on modern Ubuntu it is a symlink to `ping`, so `ping -6` would be more current, but `ping6` still works and is widely understood. No change needed.
- The "Configuring IPv6 for a Specific Interface Only" example uses `to: ::/0` rather than `to: default`; both are valid and equivalent per the Netplan docs, so this was left as written.
