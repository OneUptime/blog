# Validation Summary: How to Use Netplan with the networkd Renderer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML-based network configuration)
- systemd-networkd (networkd renderer)
- NetworkManager (mentioned for comparison)
- networkctl (CLI for inspecting networkd state)
- Linux bonding (active-backup mode)
- Ubuntu Server / cloud instances

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/stable/examples/
- systemd-networkd man page: https://www.freedesktop.org/software/systemd/man/systemd-networkd.html
- networkctl(1) man page: https://www.freedesktop.org/software/systemd/man/networkctl.html
- Local `netplan apply --help` output to verify CLI syntax
- Ubuntu Server networking guide: https://ubuntu.com/server/docs/network-configuration

## Issues Found
No technical issues found.

The post's technical content is accurate:
- The claim that Netplan uses `networkd` and `NetworkManager` as primary backend renderers is correct (OpenVSwitch is a less commonly used third option, but the two-renderer framing is reasonable for an introductory post).
- The basic YAML structure (`network`, `version: 2`, `renderer: networkd`, `ethernets`) is correct.
- The static IP example uses the modern `routes: - to: default` syntax instead of the deprecated `gateway4` key — this is the correct approach for current Netplan versions.
- The bond example uses valid keys: `interfaces`, `parameters.mode: active-backup`, `parameters.primary: eth0` (the `primary` parameter is only valid in `active-backup` mode, which matches here).
- All commands (`sudo systemctl enable --now systemd-networkd`, `systemctl status systemd-networkd`, `sudo netplan apply`, `networkctl list`, `networkctl status eth0`) are correct and current.
- DNS server examples (1.1.1.1 Cloudflare, 9.9.9.9 Quad9) are valid public resolvers.

## Review Notes
- The post correctly avoids the deprecated `gateway4`/`gateway6` keys in favor of `routes: - to: default`. This is the recommended approach since Netplan 0.103+.
- For production use, readers may want to consider also running `sudo netplan try` (with automatic rollback) before `sudo netplan apply` when applying changes remotely, but that is a recommended-best-practice addition rather than a correction.
- The bond example doesn't include a MII monitor interval (`mii-monitor-interval`), which is commonly set in production active-backup bonds. This is an omission rather than an error — the configuration is still valid as-is.
