# Validation Summary: How to Troubleshoot NetworkManager Connection Issues on Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NetworkManager
- nmcli (NetworkManager command-line interface)
- systemctl / systemd
- journalctl
- dhclient (ISC DHCP client)
- resolvectl / systemd-resolved
- ip (iproute2)
- ethtool

## Sources Consulted
- NetworkManager official documentation: https://networkmanager.dev/docs/
- nmcli(1) man page: https://developer-old.gnome.org/NetworkManager/stable/nmcli.html
- nm-settings(5) man page for connection properties (ipv4.method, ipv4.dns)
- systemd journalctl(1) man page: https://www.freedesktop.org/software/systemd/man/journalctl.html
- resolvectl(1) man page: https://www.freedesktop.org/software/systemd/man/resolvectl.html
- dhclient(8) man page: https://linux.die.net/man/8/dhclient
- ethtool(8) man page
- ip-link(8) man page (iproute2)

## Issues Found
No technical issues found. All commands, flags, field names, and descriptions are accurate:
- `systemctl status/start/enable NetworkManager` commands are correct.
- `nmcli connection show`, `nmcli device status`, `nmcli device show <iface>` syntax is accurate.
- The `-p` / `--pretty` flag for `nmcli` is valid for pretty-printed output.
- Field names `GENERAL.STATE`, `IP4.ADDRESS`, `IP4.GATEWAY`, `IP4.DNS` match nmcli's actual output.
- `journalctl -u NetworkManager --since "..." -f` syntax is correct.
- `nmcli connection down/up` and `nmcli device disconnect/connect` commands are valid.
- `nmcli connection modify ... ipv4.dns "8.8.8.8 1.1.1.1"` with space-separated list is supported syntax.
- `nmcli connection add type ethernet ifname ... con-name ... ipv4.method auto` is correct syntax for creating a DHCP-based ethernet profile.
- `resolvectl status <iface>` is the correct systemd-resolved query command.

## Review Notes
- Modern NetworkManager (1.20+) uses its internal DHCP client by default rather than external `dhclient`; the `dhclient` example still works on systems where it is installed and used, but users on newer distributions may not have `dhclient` available unless `isc-dhcp-client` is installed. This does not make the information incorrect, just potentially distribution-dependent.
- `resolvectl status eth0` requires systemd-resolved to be active (default on most modern distributions like Ubuntu 18.04+, Fedora, Arch).
- The post is a solid, practical troubleshooting reference suitable for both desktop and server Linux environments.
