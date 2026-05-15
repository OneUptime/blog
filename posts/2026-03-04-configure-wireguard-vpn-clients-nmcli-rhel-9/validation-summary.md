# Validation Summary: How to Configure WireGuard VPN Clients with nmcli on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- WireGuard
- DNS configuration with NetworkManager

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up a WireGuard VPN": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_setting-up-a-wireguard-vpn_configuring-and-managing-networking
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nm-settings-keyfile` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Red Hat Enterprise Linux 9 documentation, "Using different DNS servers for different domains": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/using-different-dns-servers-for-different-domains_configuring-and-managing-networking

## Issues Found
- The installation section incorrectly instructed users to install EPEL before installing WireGuard tools. Red Hat's RHEL 9 documentation installs `wireguard-tools` directly with `dnf install wireguard-tools`, so the EPEL step was removed.
- The post stated that nmcli peer syntax requires editing the NetworkManager connection file directly. NetworkManager supports configuring peers with the `wireguard.peers` property, so the manual keyfile append was replaced with `nmcli connection modify "wg-vpn" wireguard.peers ...`.
- The post listed a pre-shared key as recommended but did not show how to configure it in the NetworkManager peer definition. Added the supported `preshared-key=` peer attribute as an optional example.
- The post omitted Red Hat's RHEL 9 support caveat for WireGuard. Added a short note that WireGuard is provided as a Technology Preview on RHEL 9.
- The split DNS explanation did not mention that conditional forwarding requires a compatible NetworkManager DNS plugin. Added a note about `dnsmasq` or `systemd-resolved`.
- The troubleshooting section used `resolvectl status wg0`, which assumes `systemd-resolved` is in use. Replaced it with `nmcli device show wg0 | grep DNS`, which aligns with NetworkManager-managed DNS checks.

## Review Notes
The import command for wg-quick-style WireGuard configs is commonly supported by NetworkManager, but environments may vary by NetworkManager version and installed components. The post now matches RHEL 9's documented nmcli workflow for creating and managing a WireGuard client profile.
