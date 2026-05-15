# Validation Summary: How to Use nmtui for Text-Based Network Configuration on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmtui
- nmcli
- hostnamectl
- Ethernet, Wi-Fi, bond, bridge, and VLAN connection profiles

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking, "Configuring an Ethernet connection by using nmtui": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-an-ethernet-connection_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 Configuring and managing networking, "Configuring a wifi connection by using nmtui": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_managing-wifi-connections_configuring-and-managing-networking
- NetworkManager nmtui manual page: https://networkmanager.dev/docs/api/latest/nmtui.html
- Local `nmtui(1)` manual page from NetworkManager 1.46.0
- Local `nmcli connection modify --help` output from NetworkManager 1.46.0
- Local `nm-settings-nmcli(5)` manual page for `ipv4.route-metric` and `802-3-ethernet.mtu`
- Red Hat Enterprise Linux 7 Networking Guide hostname section for nmtui and systemd-hostnamed behavior: https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configuring_host_names_using_the_text_user_interface_nmtui

## Issues Found
- The post said `nmtui` is included by default on RHEL as part of `NetworkManager-tui`. Red Hat documentation and package references support `NetworkManager-tui` as the package that provides `nmtui`, but installation can vary by system profile. The wording now says it is provided by that package.
- The post said `nmtui` and `nmcli` "produce the same results." Because the same post correctly notes that `nmtui` exposes fewer NetworkManager properties than `nmcli`, this was too broad. The wording now says both tools configure the same NetworkManager connection profiles.

## Review Notes
The `nmtui edit`, `nmtui connect`, and `nmtui hostname` subcommands match the NetworkManager manual. The static IPv4 workflow, keyboard navigation, package installation command, hostname comparison with `hostnamectl set-hostname`, and `nmcli connection modify` examples are technically correct for RHEL 9 and current NetworkManager behavior.
