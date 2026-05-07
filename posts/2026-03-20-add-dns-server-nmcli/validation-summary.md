# Validation Summary: How to Add a DNS Server with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- NetworkManager
- nmcli
- DNS configuration

## Sources Consulted
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `NetworkManager.conf` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html

## Issues Found
- The introduction and conclusion implied all DNS configuration uses `ipv4.dns`. I changed both lines to refer specifically to IPv4 DNS, because NetworkManager also has separate `ipv6.dns` and global DNS configuration.
- The command `nmcli connection show "Wired connection 1" | grep DNS` did not reliably show profile DNS settings; it can match active `IP4.DNS` output instead. I replaced it with `nmcli -f ipv4.dns,ipv4.dns-search connection show "Wired connection 1"` so the example queries the profile fields directly.
- The section heading `Set Global Fallback DNS in NetworkManager` was inaccurate. NetworkManager documents `[global-dns]` and `[global-dns-domain-*]` as global DNS settings that override connection-specific DNS, so I renamed the heading to remove the fallback claim.

## Review Notes
- Example connection names such as `"Wired connection 1"` and interface names such as `eth0` are placeholders; real systems may use different identifiers.
- Command syntax matched the current upstream documentation and local `nmcli` 1.46.0 help/output.
