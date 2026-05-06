# Validation Summary: How to Configure DHCP with nmcli

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux networking
- `nmcli`
- NetworkManager
- DHCP
- IPv4
- `iproute2`

## Sources Consulted
- NetworkManager Reference Manual: `nmcli` - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager Reference Manual: `nm-settings-nmcli` - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager D-Bus API Types - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-dbus-types.html
- Local `nmcli` help output on NetworkManager `1.46.0` (`nmcli --version`, `nmcli connection help`, `nmcli device help`)
- Local `ip-address(8)` man page from `iproute2`

## Issues Found
- The post used `nmcli connection up` by itself after modifying existing connection profiles. NetworkManager distinguishes editing a profile from applying those edits to the active device, so I changed the affected examples to reconnect the profile with `nmcli connection down` followed by `nmcli connection up`.
- The DHCP hostname example set `ipv4.dhcp-hostname` without explicitly enabling `ipv4.dhcp-send-hostname`. I added `ipv4.dhcp-send-hostname yes` so the hostname is sent reliably as described.
- The lease renewal section suggested using `dhclient` directly. In a NetworkManager-managed workflow this is not the documented `nmcli` path and can conflict with NetworkManager, so I removed that alternative and kept the reconnect method.

## Review Notes
- Examples use `eth0` as a placeholder interface name. On many current Linux systems the actual interface name will be something like `enp0s3` or `ens33`.
- The corrected commands are valid for current upstream NetworkManager documentation and for the locally installed `nmcli` version checked during review (`1.46.0`).
