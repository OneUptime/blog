# Validation Summary: How to Configure a Static IPv4 Address with nmcli

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NetworkManager
- nmcli (NetworkManager CLI)
- Linux networking
- iproute2 (`ip addr`, `ip route`)
- IPv4 static addressing
- DNS configuration

## Sources Consulted
- nmcli(1) man page: https://networkmanager.dev/docs/api/latest/nmcli.html
- nm-settings(5) man page (ipv4.* and ipv6.* properties): https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager Reference Manual: https://networkmanager.dev/docs/
- ip(8) and ip-address(8) man pages from iproute2: https://man7.org/linux/man-pages/man8/ip.8.html

## Issues Found
No technical issues found.

## Review Notes
- All nmcli properties used (`ipv4.method`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `ipv6.method`) are correct and current.
- The `+ipv4.addresses` / `-ipv4.addresses` syntax for appending and removing list values via `nmcli connection modify` is correct per nm-settings-nmcli(5).
- The comma-separated quoted form for `ipv4.dns "8.8.8.8,8.8.4.4"` is accepted by nmcli; space-separated values would also work.
- The `ip addr flush` + `ip addr add` + `ip route add default` sequence correctly produces a non-persistent change, as the post explicitly notes.
- `ipv6.method disabled` is the correct way to fully disable IPv6 on a NetworkManager connection profile.
- Connection names like `"Wired connection 1"` are the typical default NetworkManager-generated names; users on different distributions may see different defaults (e.g., `eno1`-based names) — running `nmcli connection show` first, as the post recommends, handles this.
- Consider noting in the future that `nmcli connection up` re-applies the profile and may briefly drop the link, which matters when working over SSH on the same interface.
