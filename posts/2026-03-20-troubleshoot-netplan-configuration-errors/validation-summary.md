# Validation Summary: How to Troubleshoot Netplan Configuration Errors on Linux

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Netplan (Ubuntu network configuration abstraction)
- systemd-networkd
- NetworkManager (referenced as alternate backend)
- YAML
- `networkctl` / `ip` / `dhclient` networking utilities
- Ubuntu Linux

## Sources Consulted
- Netplan official documentation: https://netplan.readthedocs.io/
- Ubuntu manpage for `netplan-try`: https://manpages.ubuntu.com/manpages/jammy/man8/netplan-try.8.html
- Ubuntu manpage for `netplan`: https://manpages.ubuntu.com/manpages/jammy/man8/netplan.8.html
- systemd `networkctl` documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `dhclient` Ubuntu manpage: https://manpages.ubuntu.com/manpages/xenial/man8/dhclient.8.html

## Issues Found
1. **Incorrect flag placement for `netplan generate --debug`** — The `netplan` CLI expects global flags (like `--debug`) before the subcommand, not after. The earlier example in the post (`netplan --debug apply`) correctly places the flag before the subcommand. Changed `sudo netplan generate --debug` to `sudo netplan --debug generate` for consistency and correctness.

## Review Notes
- The "Wrong" YAML example is intentionally malformed to demonstrate the tab-vs-space error; the missing `version: 2` key in that example is acceptable since the purpose is to show the tab indentation issue.
- `netplan try` default timeout of 120 seconds is accurate.
- `dhclient` remains available on Ubuntu but is being phased out in favor of systemd-networkd's native DHCP and/or `networkctl renew`. The recovery example is still valid but may warrant a note in a future update for modern Ubuntu releases where `isc-dhcp-client` is not installed by default.
- Commands `networkctl status`, `networkctl list`, and `ip -4 addr show` are all valid.
