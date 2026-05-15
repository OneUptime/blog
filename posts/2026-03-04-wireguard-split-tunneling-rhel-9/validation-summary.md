# Validation Summary: How to Set Up WireGuard with Split Tunneling on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- wg-quick
- NetworkManager and nmcli
- systemd-resolved and resolvectl
- Linux routing with iproute2
- DNS split routing

## Sources Consulted
- WireGuard official quick start and cryptokey routing overview: https://www.wireguard.com/quickstart/
- WireGuard official wg-quick man page: https://git.zx2c4.com/wireguard-tools/tree/src/man/wg-quick.8
- Red Hat Enterprise Linux 9 networking documentation, WireGuard VPN setup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local NetworkManager 1.46.0 nmcli help and nm-settings-nmcli man page output
- Local systemd-resolved.service and resolvectl man page output
- Local NetworkManager.conf man page output

## Issues Found
- The NetworkManager example used `nmcli connection modify "wg-split" wireguard.peers ...`. On RHEL 9-era NetworkManager, `wireguard.peers` is not exposed as an nmcli-modifiable property, and the local NetworkManager 1.46.0 schema rejects it. Red Hat's RHEL 9 documentation describes adding WireGuard peer settings by editing the `.nmconnection` file with a `[wireguard-peer.<public_key>]` section. I changed the example to append the peer stanza to `/etc/NetworkManager/system-connections/wg-split.nmconnection` and reload NetworkManager connections.

## Review Notes
- The `AllowedIPs` explanation is technically correct: it is used for WireGuard cryptokey routing and, with wg-quick or NetworkManager peer routes enabled, also drives host routes.
- The systemd-resolved split DNS example is correct when systemd-resolved is installed, running, and integrated with NetworkManager. The post already includes that caveat.
- The full-tunnel exclusion example relies on a more specific route in the main routing table overriding wg-quick's default-route handling, which is consistent with wg-quick's documented route behavior.
