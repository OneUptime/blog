# Validation Summary: How to Add Static Routes with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `nmcli`
- NetworkManager
- Static IPv4 routing
- `iproute2`

## Sources Consulted
- NetworkManager Reference Manual: `nm-settings-nmcli` (official property syntax for `ipv4.routes` and `ipv4.ignore-auto-routes`): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager Reference Manual: `nmcli` (official `connection modify` syntax, `+`/`-` modifiers, and `connection up` behavior): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager Reference Manual: `nm-settings-keyfile` (cross-check for route list encoding): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- Local CLI help checked during review: `nmcli --help`, `nmcli connection show help`, `ip route help`

## Issues Found
- The "Replace All Routes" example used an invalid `ipv4.routes` value by concatenating two routes in a single space-delimited string. NetworkManager documents `ipv4.routes` as a comma-separated list of routes, so the example was corrected to `ipv4.routes "192.168.50.0/24 10.0.0.2, 192.168.60.0/24 10.0.0.3"`.

## Review Notes
- The post's use of `nmcli connection up` to apply saved profile changes is valid. For future refinement, NetworkManager also documents `nmcli device reapply IFNAME` for pushing changes to the currently active device without a full reconnect.
