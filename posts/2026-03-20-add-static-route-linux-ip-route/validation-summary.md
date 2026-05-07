# Validation Summary: How to Add a Static Route on Linux Using ip route

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux routing
- `iproute2` / `ip route`
- Netplan
- NetworkManager / `nmcli`
- systemd-networkd

## Sources Consulted
- iproute2 `ip-route(8)` manual and command help: `man ip-route`, `ip route help`
- iproute2 upstream man page source: https://raw.githubusercontent.com/iproute2/iproute2/main/man/man8/ip-route.8.in
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- systemd `systemd.network` reference: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html

## Issues Found
- The Netplan persistence example placed `routes:` directly under `network:`. Netplan documents `routes` under a specific interface definition, so the snippet was updated to nest the route under `network.ethernets.eth0.routes` and include `version: 2`.
- The NetworkManager example used `nmcli connection modify eth0 ...`, which implies the interface name is always the connection identifier. `nmcli connection modify` operates on a connection profile ID, UUID, or path, so the command was updated to `id "<connection-name>"` to make the target correct and unambiguous.
- The default-route comment said `ip route add default ...` would "Set or add" a default gateway. `add` only adds the route and will fail if an identical default route already exists, so the wording was corrected to "Add a default gateway."

## Review Notes
- The `ip route get` output shown in the post is an example only; actual fields such as `dev`, `src`, and `uid` vary by host and current routing state.
- The remaining `ip route` command examples align with current `iproute2` syntax and behavior.
