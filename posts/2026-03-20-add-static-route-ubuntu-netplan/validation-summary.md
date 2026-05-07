# Validation Summary: How to Add a Static Route on Ubuntu Using Netplan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubuntu networking
- Netplan
- Static routing
- systemd-networkd
- NetworkManager
- iproute2 (`ip route`)
- `networkctl`

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan CLI reference: https://netplan.readthedocs.io/en/0.106/cli/
- Netplan examples: https://netplan.readthedocs.io/en/0.105/examples.html
- systemd `networkctl` manual: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Local command help checked: `netplan --help`, `netplan generate --help`, `networkctl --help`, `ip route help`
- Local `netplan generate --root-dir` output was inspected to confirm how Netplan renders a direct route with and without `via`

## Issues Found
- The "Route via a Specific Interface" example used `via: 0.0.0.0` with `on-link: true` for a regular subnet route. I changed it to a link-scope route (`scope: link`) with no gateway, because Netplan documents direct routes as routes without `via`, and local `netplan generate` output confirmed that omitting `via` produces a direct `Scope=link` route.
- The conclusion implied that `via` is always part of a static route definition. I narrowed that wording so it correctly states that `via` is used when the route goes through a gateway.
- The verification comment for `networkctl status eth0` was too general. I clarified that it applies when the interface is managed by `systemd-networkd`.

## Review Notes
- `netplan apply` is correct as written. For remote systems, `netplan try` is often safer because it supports automatic rollback if connectivity is lost.
