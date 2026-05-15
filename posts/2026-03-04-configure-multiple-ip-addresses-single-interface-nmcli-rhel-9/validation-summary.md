# Validation Summary: How to Configure Multiple IP Addresses on a Single Interface Using nmcli on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux networking
- NetworkManager
- nmcli
- IPv4 and IPv6 static addressing
- Static routes
- Linux iproute2 `ip addr`
- NetworkManager keyfile format

## Sources Consulted
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nm-settings-keyfile` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- Red Hat Enterprise Linux 9 Configuring and managing networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Local `nmcli --version` and `nmcli connection modify --help` output, NetworkManager 1.46.0
- Local `man nm-settings-nmcli` and `man nm-settings-keyfile` pages

## Issues Found
- The examples used `ens192` as the argument to `nmcli connection modify` and `nmcli connection up` without clarifying that these commands operate on a connection profile identifier, not strictly an interface name. I added a note explaining that the examples assume the connection profile is named `ens192`, and that readers should use their actual connection profile name if it differs.
- The post said setting the `may-fail` property could prevent NetworkManager from removing addresses added directly with `ip addr`. That is incorrect: `ipv4.may-fail` / `ipv6.may-fail` controls whether overall activation can proceed if that IP family fails. I replaced the sentence with guidance to manage the address through NetworkManager if it must coexist reliably with a NetworkManager-managed profile.

## Review Notes
The nmcli examples for adding, appending, removing, and replacing multiple IPv4 and IPv6 addresses match NetworkManager's documented comma-separated address lists and `+` / `-` modifiers for multi-value properties. The keyfile example is valid, though current NetworkManager documentation recommends using the separate `gateway` key instead of embedding the gateway in `address1`.
