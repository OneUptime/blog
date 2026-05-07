# Validation Summary: How to Add a Static Route on RHEL Using nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- NetworkManager
- nmcli
- IPv4 static routing
- NetworkManager keyfile connection profiles

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Configuring a static route by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-static-routes_configuring-and-managing-networking
- NetworkManager Reference Manual, `nm-settings-nmcli`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager Reference Manual, `nm-settings-keyfile`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- Red Hat Enterprise Linux 8 documentation, "NetworkManager connection profiles in keyfile format": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- Local `nmcli` help and man pages from NetworkManager 1.46.0 (`nmcli --offline connection modify help`, `man nm-settings-nmcli`, `man nm-settings-keyfile`)

## Issues Found
- The section titled "Add Route Using connection.d Files" was technically incorrect. It referred to `connection.d` files, but the example actually targeted a `.nmconnection` keyfile.
- The same section overwrote `/etc/NetworkManager/system-connections/eth0.nmconnection` with only an `[ipv4]` section. That would not be a valid way to update an existing connection profile and could break the profile because required settings such as `[connection]` were omitted.
- The example also implied that the file name is always `eth0.nmconnection`, which is not guaranteed. I changed the section to instruct readers to locate the existing profile file and add `route1` and `route2` entries under the existing `[ipv4]` section instead, then reload and reactivate the connection.
- The conclusion simplified the `ipv4.routes` syntax too far. I updated it to `network[/prefix] gateway [metric]` so it matches NetworkManager's documented route format more closely.

## Review Notes
- The main `nmcli connection modify ... +ipv4.routes` examples are technically valid.
- Repeating `+ipv4.routes` in one command works, although Red Hat documentation commonly shows multiple routes as a comma-separated list in a single value.
- Direct keyfile editing applies only when the connection profile is stored in keyfile format, and both Red Hat and NetworkManager documentation recommend using `nmcli` instead of manual editing when possible.
