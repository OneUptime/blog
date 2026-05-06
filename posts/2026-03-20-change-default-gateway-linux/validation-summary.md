# Validation Summary: How to Change the Default Gateway on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux routing
- `iproute2`
- `ip route`
- NetworkManager
- `nmcli`
- Netplan

## Sources Consulted
- Local `ip-route(8)` man page from the installed `iproute2` package
- Local `nmcli(1)` man page from the installed NetworkManager package
- Local `nm-settings-nmcli(5)` man page from the installed NetworkManager package
- NetworkManager Reference Manual: `nmcli` https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager Reference Manual: IP settings and route properties https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-dbus.html
- Netplan YAML configuration reference https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/

## Issues Found
- The introduction and preferred method overstated `ip route replace` as an atomic, no-gap connectivity guarantee. I changed the wording to match what `iproute2` documents: it changes or adds the route in one command.
- The lower-metric example incorrectly implied that the existing default route would normally have metric `100`. I updated the example to check current metrics first and clarified that the new route is preferred only when the existing default route has a higher metric value.
- The old-route removal example in Method 3 matched an assumed metric of `100`, which could fail on systems using a different metric. I removed that assumption and now delete the old route by gateway only in the example.
- The `nmcli` example used `eth0` as if it were always the connection profile identifier. I changed it to use a connection profile name and `nmcli connection up id ...`, which matches NetworkManager's documented connection-ID behavior.
- The verification section said `ping` tested connectivity "through" the new gateway. I corrected that to "to" the new gateway, which is what the command actually verifies.

## Review Notes
- Netplan's `routes:` syntax with `to: default` and `via:` is current. Netplan documents `gateway4` and `gateway6` as deprecated, so the post is using the preferred approach.
- `nmcli connection modify ... ipv4.gateway ...` is meaningful for a profile with manual IPv4 addressing, so I clarified that scope in the heading.
- `traceroute` is a valid verification command, but the package may not be installed by default on all Linux distributions.
