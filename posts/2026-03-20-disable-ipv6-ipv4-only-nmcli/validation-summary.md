# Validation Summary: How to Disable IPv6 and Use IPv4 Only with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- NetworkManager
- `nmcli`
- IPv4
- IPv6
- `sysctl`
- `iproute2`

## Sources Consulted
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Linux kernel `ip-sysctl` documentation (`disable_ipv6`): https://docs.kernel.org/6.18/networking/ip-sysctl.html
- GNU Bash Reference Manual, Word Splitting: https://www.gnu.org/software/bash/manual/html_node/Word-Splitting.html

## Issues Found
- The description implied that `ipv6.method ignore` forces IPv4-only operation. NetworkManager documents `ignore` as making no changes to IPv6 configuration on the interface. I corrected the description and introduction so only `disabled` is presented as the IPv4-only option.
- The verification example used `ip -6 route show`, which lists all IPv6 routes on the host and can still show loopback or routes from other interfaces. I narrowed it to `ip -6 route show dev eth0` and also made the address check interface-specific with `ip -6 addr show dev eth0`.
- The “disable IPv6 on all connections” loop iterated over connection names with `for conn in $(...)`, which breaks on names containing spaces such as the default `Wired connection 1`. I changed it to iterate over UUIDs with `while IFS= read -r uuid`.
- The `ipv6.method` options table was incomplete and described `ignore` inaccurately. I updated the `ignore` description and added the documented `shared` and `link-local` methods.
- The section heading `Re-enable IPv6` could be read as undoing the sysctl-based global disable, but the commands only re-enable IPv6 on a NetworkManager connection profile. I renamed the heading to `Re-enable IPv6 on a Connection`.

## Review Notes
- The post’s `sysctl` example disables IPv6 on loopback as well as non-loopback interfaces. That is technically valid for a full system-wide disable, but it also removes `::1`, which some local software may expect.
- Command syntax was checked against NetworkManager upstream documentation and local `nmcli` 1.46.0 help; the networking commands were not executed on this machine to avoid disrupting connectivity.
