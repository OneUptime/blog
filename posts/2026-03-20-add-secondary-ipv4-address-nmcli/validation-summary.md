# Validation Summary: How to Add a Secondary IPv4 Address with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `nmcli`
- NetworkManager
- IPv4 addressing
- `iproute2` / `ip addr`

## Sources Consulted
- NetworkManager upstream documentation: `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager upstream documentation: `nm-settings-nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager upstream documentation: `nmcli-examples` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- Local system manual: `man nmcli(1)`
- Local system manual: `man nm-settings-nmcli(5)`
- Local system manual: `man ip-address(8)`
- Local CLI help: `nmcli connection modify --help`

## Issues Found
- The `Replace All IPs` example used a space-separated `ipv4.addresses` value. `nmcli` rejects that form for multiple addresses in a single value; it must be comma-separated. I changed `ipv4.addresses "192.168.1.100/24 192.168.1.101/24 192.168.1.102/24"` to `ipv4.addresses "192.168.1.100/24, 192.168.1.101/24, 192.168.1.102/24"`.
- The comment `no gateway needed for secondary` was too broad. I changed it to `different directly connected subnet` to avoid overstating routing behavior. Adding an address on another directly connected subnet does not itself require an extra gateway, but broader reachability still depends on routing.

## Review Notes
- The post’s `+ipv4.addresses` and `-ipv4.addresses` usage is correct for multi-valued NetworkManager properties.
- `nmcli connection up "Wired connection 1"` is a valid way to apply the updated profile, but it reactivates the connection profile. On remote systems, that can briefly interrupt connectivity.
- The verification examples use `eth0` as the interface name. Actual interface names may differ on modern Linux systems.
