# Validation Summary: How to Use Netplan with the NetworkManager Renderer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML network configuration tool)
- NetworkManager (Linux network management daemon)
- systemd-networkd (`networkd` renderer)
- Ubuntu (Desktop and Server)
- `nmcli` (NetworkManager command-line client)

## Sources Consulted
- Netplan official documentation: https://netplan.readthedocs.io/
- Netplan YAML reference (device types, renderers): https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan NetworkManager renderer notes: https://netplan.readthedocs.io/en/latest/explanation/#network-manager
- NetworkManager documentation: https://networkmanager.dev/
- `nmcli` man page (connection vs. device subcommands)
- Ubuntu Server Guide — Networking / Netplan: https://ubuntu.com/server/docs/network-configuration
- Netplan source (NetworkManager backend connection naming convention `netplan-<id>`)

## Issues Found

1. **`wlan0` placed under `ethernets:` in the "Mixing Renderers" example.**
   Netplan's schema requires wireless interfaces to be defined under the `wifis:` section, not `ethernets:`. The original snippet would fail Netplan's schema validation. Moved `wlan0` into a `wifis:` block and added a minimal `access-points:` entry (which is required for `wifis` devices in Netplan).

2. **`sudo nmcli connection show eth0` would not match Netplan-generated connections.**
   When the NetworkManager renderer is used, Netplan writes connection profiles named `netplan-<id>` (e.g., `netplan-eth0`) into `/run/NetworkManager/system-connections/`. A bare `nmcli connection show eth0` would return "unknown connection". Updated the command to `sudo nmcli connection show netplan-eth0` and added a clarifying inline comment.

3. **Comment "Validate syntax" for `sudo netplan try` was misleading.**
   `netplan try` actually *applies* the configuration and reverts it if the user does not confirm within a timeout — it is not a syntax-only validator. Updated the comment to "Apply with automatic rollback if not confirmed" to reflect what the command actually does.

## Review Notes

- The path `/run/NetworkManager/system-connections/` for Netplan-generated NM profiles is correct (this is the runtime directory; user-managed profiles live under `/etc/NetworkManager/system-connections/`).
- `renderer: NetworkManager` and `renderer: networkd` capitalization is correct and case-sensitive in Netplan YAML.
- The static-IP example using `routes:` with `to: default` and `via:` matches the modern Netplan syntax (the legacy `gateway4:` key is deprecated since Netplan 0.103, so the post's choice of `routes:` is good).
- The wifi `access-points:` example uses a plaintext password for illustration; real desktop deployments typically let users configure WiFi credentials via the GNOME/KDE applet rather than declare them in Netplan YAML, but storing them in YAML is supported and works.
- `systemctl status NetworkManager` and `nmcli connection show` (no args) commands are correct.
