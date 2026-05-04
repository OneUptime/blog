# Validation Summary: How to Configure a Static IPv4 Address with NetworkManager and nmcli

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NetworkManager (network management daemon)
- nmcli (NetworkManager command-line interface)
- IPv4 networking
- Linux (RHEL, Fedora, CentOS, and other distros that use NetworkManager)
- iproute2 (`ip` command for verification)

## Sources Consulted
- nmcli(1) man page (https://networkmanager.dev/docs/api/latest/nmcli.html)
- nm-settings(5) man page for connection properties (https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html)
- Red Hat Enterprise Linux documentation: "Configuring and managing networking" (https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking)
- Fedora Project: NetworkManager documentation (https://fedoraproject.org/wiki/Networking/CLI)
- Local verification via `nmcli --version` (1.46.0) and `nmcli con --help`

## Issues Found
No technical issues found.

All commands were verified against the nmcli CLI reference and NetworkManager documentation:
- `nmcli con show` and `nmcli con show --active` are valid syntax for listing connection profiles.
- `nmcli con mod` with `ipv4.method`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns` properties are correct property names per nm-settings(5).
- `nmcli con add type ethernet con-name <name> ifname <iface>` is the canonical creation syntax.
- The `+ipv4.routes "10.0.0.0/8 192.168.1.254"` syntax (destination/prefix nexthop) and `+ipv4.addresses` array-append syntax are correct.
- Setting `ipv4.method auto` with empty string values to clear addresses/gateway/dns when reverting to DHCP is the documented approach.
- `connection.autoconnect yes` is a valid property on the connection setting.
- `/etc/NetworkManager/system-connections/` is the correct system-wide profile location, and `nmcli con reload` is the correct command to re-read those files after manual edits.
- `nmcli con up` is required to apply method/address changes to an active connection (modifications alone do not reactivate).

## Review Notes
- Minor caveat: `connection.autoconnect` defaults to `yes` for new profiles, so the explicit `nmcli con mod ... connection.autoconnect yes` step is usually a no-op for freshly added connections — but the command is harmless and the post's framing ("Ensure...") is accurate.
- The post does not mention that the legacy `ifcfg` keyfile format was deprecated and the `keyfile` plugin became the default in NetworkManager 1.30+ (and is the only plugin shipped on RHEL 9). The `/etc/NetworkManager/system-connections/` path mentioned in the post is correct for the keyfile plugin and works on all current distributions.
- The `nmcli` short-form aliases (`con` for `connection`, `mod` for `modify`) used throughout the post are stable and supported.
- For wireless connections, additional properties (`802-11-wireless.ssid`, `802-11-wireless-security.*`) would be needed; the post is scoped to ethernet, which is appropriate given the title and examples.
