# Validation Summary: How to Connect to Hidden WiFi Networks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- NetworkManager and nmcli
- wpa_supplicant
- Netplan
- GNOME Wi-Fi settings
- Linux wireless tools (`iw`, `wpa_cli`, `dhclient`, `journalctl`)

## Sources Consulted
- NetworkManager nmcli reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Netplan YAML configuration documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Local `nmcli` 1.46.0 manual/help output for `device wifi connect`, `connection add`, and wireless settings properties
- Local `wpa_supplicant.conf` manual page for `scan_ssid`, `key_mgmt`, `psk`, `priority`, and `ctrl_interface`

## Issues Found
- The Netplan example mixed the top-level `password` shortcut with an explicit `auth:` block. Netplan documents `password` as a shortcut equivalent to `auth: key-management: psk` plus `auth: password`; when an explicit `auth:` block is shown, the passphrase should be placed under `auth`. Updated the snippet to use `auth.password` with `auth.key-management: psk`.

## Review Notes
- NetworkManager's `nmcli device wifi connect` officially supports `hidden yes`, and `802-11-wireless.hidden` is the documented profile property for non-broadcast SSIDs.
- Netplan supports `hidden: true` for Wi-Fi access point entries since Netplan 0.100. The `networkd` renderer can handle Wi-Fi through generated wpa_supplicant configuration, but it requires wpa_supplicant to be installed because systemd-networkd has no native Wi-Fi support.
- `wpa_supplicant` documents `scan_ssid=1` for hidden SSIDs, matching the post's guidance.
