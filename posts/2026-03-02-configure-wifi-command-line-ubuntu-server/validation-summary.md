# Validation Summary: How to Configure WiFi from the Command Line on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server networking
- Netplan
- systemd-networkd
- NetworkManager and nmcli
- wpa_supplicant
- iw and Linux wireless tools
- DHCP and static IP configuration
- WPA/WPA2-PSK and WPA2-Enterprise EAP/PEAP

## Sources Consulted
- Ubuntu Server documentation: About Netplan, https://ubuntu.com/server/docs/explanation/networking/about-netplan/
- Ubuntu Server documentation: Configuring networks, https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Netplan YAML configuration reference, https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager nmcli reference manual, https://networkmanager.dev/docs/api/1.32.10/nmcli.html
- Local Ubuntu command help and service metadata: `netplan --help`, `netplan generate --help`, `nmcli --help`, `wpa_passphrase`, and `systemctl cat wpa_supplicant@.service`

## Issues Found
- Replaced the `iwconfig` interface listing example with an `iw dev` based command. The post already installs and uses `iw`, while `iwconfig` is a legacy tool and is not guaranteed to be installed on modern Ubuntu Server systems.
- Corrected the wpa_supplicant configuration filename from `/etc/wpa_supplicant/wpa_supplicant.conf` to `/etc/wpa_supplicant/wpa_supplicant-wlan0.conf`. Ubuntu's templated `wpa_supplicant@wlan0` systemd service reads the interface-specific file path.
- Updated the manual `wpa_supplicant` test command to use the same interface-specific configuration file, keeping it consistent with the created file and the systemd service.
- Removed the claim that NetworkManager is common with Ubuntu 20.04+ server installations. Ubuntu Server networking is handled through Netplan, typically rendered through systemd-networkd unless the installation is explicitly configured to use NetworkManager.

## Review Notes
- The Netplan YAML examples for DHCP WiFi, static IPv4 routing, and EAP/PEAP authentication were checked with `netplan generate --root-dir` and parsed successfully.
- The nmcli WiFi connection examples match the documented `nmcli device wifi connect` syntax. The command only creates simple open/WEP/WPA-PSK connections automatically; enterprise profiles may need preconfigured NetworkManager connections.
- Direct wpa_supplicant configuration can conflict with Netplan, NetworkManager, or other network managers if more than one tool manages the same wireless interface. The post's Netplan-first recommendation is appropriate for Ubuntu Server.
