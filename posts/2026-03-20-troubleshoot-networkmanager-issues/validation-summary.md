# Validation Summary: How to Troubleshoot NetworkManager Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NetworkManager (Linux network configuration daemon)
- nmcli (NetworkManager command-line interface)
- journalctl / systemd-journald
- systemd service management (systemctl)
- systemd-resolved
- /etc/resolv.conf (DNS resolver configuration)
- DHCP client logging
- Linux networking tools (ip addr, ip route)

## Sources Consulted
- nmcli(1) man page (local verification of subcommand syntax)
- NetworkManager.conf(5) documentation for logging levels and domains
- Official NetworkManager documentation: https://networkmanager.dev/docs/
- Freedesktop.org NetworkManager reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/
- systemd-resolved documentation: https://www.freedesktop.org/software/systemd/man/systemd-resolved.service.html
- journalctl(1) man page for -u, -n, -f flags

## Issues Found
No technical issues found.

All commands and syntax were verified:
- `systemctl status/restart NetworkManager` — correct service name and subcommands.
- `nmcli device status` / `nmcli connection show [--active]` — valid nmcli subcommands.
- `nmcli general logging level DEBUG domains ALL` — matches documented syntax `logging [level level] [domains domains...]`; `ALL` is a valid domain value.
- `nmcli connection up <name> --wait 30` — `--wait` is a valid flag (timeout in seconds).
- `nmcli device reapply/disconnect/connect <iface>` — all valid subcommands.
- `journalctl -u NetworkManager -n 100 / -f` — standard journalctl flags.
- resolv.conf symlink targets (`/run/systemd/resolve/stub-resolv.conf` and `/run/NetworkManager/resolv.conf`) — accurate for systemd-resolved and NetworkManager's direct DNS plugin respectively.
- `unmanaged-devices` config key path (`/etc/NetworkManager/conf.d/`) — correct location for drop-in configuration files.

## Review Notes
- `systemctl status networking` and `systemctl status ifupdown` target services that may not exist on all distributions (they are Debian/Ubuntu-specific legacy init scripts). The post correctly frames these as checks for conflicts, and a missing-unit result is itself informative, so the commands serve the stated diagnostic purpose.
- On newer distributions using systemd-resolved, the NetworkManager DNS plugin is typically set to `systemd-resolved`, so `/etc/resolv.conf` points to the stub resolver — the post captures this correctly.
- The debug-then-reset logging pattern is a good practice; note that the setting is runtime-only and does not persist across NetworkManager restarts (a minor caveat worth mentioning in a future revision).
