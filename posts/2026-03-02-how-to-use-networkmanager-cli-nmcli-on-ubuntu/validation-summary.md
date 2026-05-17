# Validation Summary: How to Use NetworkManager CLI (nmcli) on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- NetworkManager
- nmcli (NetworkManager CLI)
- Ubuntu networking
- WiFi (WPA2)
- OpenVPN integration
- IPv4 / IPv6 configuration
- DHCP / Static IP
- WiFi hotspot / Access Point mode
- journalctl (for NetworkManager logs)

## Sources Consulted
- `man nmcli` (NetworkManager 1.x man page on Ubuntu)
- Live verification by running `nmcli --help`, `nmcli general`, and `nmcli --mode json device` on Ubuntu
- NetworkManager upstream documentation: https://networkmanager.dev/docs/api/latest/nmcli.html
- nmcli-examples(7) man page

## Issues Found
1. **Invalid `nmcli general connectivity` command** — The `general` subcommand only supports `status | hostname | permissions | logging | reload`, not `connectivity`. Running it returns `Error: argument 'connectivity' not understood.` Replaced with `nmcli networking connectivity check`, which forces a re-check (the meaningful complement to the existing `nmcli networking connectivity` line).
2. **Invalid `nmcli --mode json device`** — The `-m | --mode` option only accepts `tabular` or `multiline`. JSON is not a supported output mode; running it returns `Error: 'json' is not a valid argument for 'json' option.` Replaced with `nmcli --mode multiline device show` and updated the comment accordingly.
3. **Incorrect comment on `nmcli connection export`** — The comment claimed it "creates a .nmconnection file", which is wrong. Per the man page, `export` only works for VPN connections and produces a file in the VPN plugin's native format (e.g., `.ovpn` for OpenVPN). `.nmconnection` is the keyfile format NetworkManager uses internally in `/etc/NetworkManager/system-connections/` and is not produced by `export`. Updated the comment to correctly note that only VPN connections are supported.
4. **Missing `--show-secrets` for displaying saved WiFi passwords** — `sudo nmcli connection show "NetworkSSID" | grep psk` only shows `<hidden>` for the psk field. The `--show-secrets` flag is required to display the actual password. Added the flag and updated the comment.

## Review Notes
- The `nmcli connection add` syntax for ethernet, wifi, and hotspot profiles is correct and matches current nmcli behavior.
- The `+ipv4.dns` / `-ipv4.dns` modifier syntax for additive/subtractive list modification is accurate.
- The `-g` (get-values), `-t` (terse), `-p` (pretty), and `-f` (fields) flags are all documented and behave as described.
- The OpenVPN import path (`nmcli connection import type openvpn file ...`) is correct, though it requires the `network-manager-openvpn` plugin package to be installed — worth mentioning to readers in a future revision.
- `journalctl -u NetworkManager -f` is the correct way to follow NetworkManager logs on systemd-based Ubuntu installations.
- The hotspot example uses `ipv4.method shared`, which is correct and enables NetworkManager's built-in NAT/DHCP for the AP.
