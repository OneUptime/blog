# Validation Summary: How to Configure WiFi with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Netplan
- Wi-Fi / WPA2 / WPA3 / WPA2-Enterprise
- systemd-networkd
- wpa_supplicant
- NetworkManager and nmcli
- Linux networking commands: iw, ip, rfkill, networkctl, journalctl

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan security documentation: https://netplan.readthedocs.io/en/stable/security/
- Ubuntu Server documentation, About Netplan: https://ubuntu.com/server/docs/explanation/networking/about-netplan/
- NetworkManager administrator documentation: https://networkmanager.dev/docs/admins/
- NetworkManager keyfile and secret flags documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- NetworkManager nmcli Wi-Fi help output from the local installed `nmcli`
- Netplan command help and feature output from the local installed `netplan`
- rfkill command help output from the local installed `rfkill`

## Issues Found
- The multiple access points section said the system tries networks "in order" and connects to whichever it sees first. Netplan's access-points mapping preconfigures available networks, but selection and roaming behavior are backend-dependent. Updated the wording to avoid promising deterministic ordering.
- The `iw dev wlan0 info` comment said it showed bitrate details. The `link` command is the status command that reports signal and transmit bitrate; `info` shows interface details. Updated the comment.
- The troubleshooting command checked `wpa_supplicant` as a generic service. With Netplan's networkd Wi-Fi backend, Netplan generates per-interface WPA units such as `netplan-wpa-wlan0.service`. Updated the command to check that service.
- The security section said NetworkManager encrypts passwords in the system keyring. NetworkManager can use user-session secret agents/keyrings, but system-wide keyfile profiles may store secrets in root-readable plaintext files. Updated the statement to distinguish user-specific secret storage from system-wide profiles.

## Review Notes
The Netplan YAML keys used in the post (`wifis`, `access-points`, `hidden`, `auth`, `key-management`, EAP certificate fields, `routes`, and DHCP route metrics) match the current Netplan reference. The WPA3 `sae` example relies on modern Netplan support and an underlying wpa_supplicant/NetworkManager stack that supports WPA3.
