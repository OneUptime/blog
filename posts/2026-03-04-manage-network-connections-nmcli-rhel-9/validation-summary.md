# Validation Summary: How to Manage Network Connections with nmcli on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager
- nmcli
- Ethernet connection profiles
- Static IPv4 configuration
- VLAN connection profiles
- NetworkManager keyfile profile loading
- systemd journal logs for NetworkManager

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing networking": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 documentation, "Configuring an Ethernet connection by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-an-ethernet-connection_configuring-and-managing-networking
- NetworkManager nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local `nmcli` 1.46.0 help output and local `nmcli(1)`, `nmcli-examples(7)`, and `nm-settings-nmcli(5)` manual pages.

## Issues Found
- The connection properties reference listed `connection.autoconnect-priority` as `0` to `999`. NetworkManager documents the valid range as `-999` to `999`, with higher values preferred for autoconnect. Updated the table to show `-999` to `999`.

## Review Notes
The `nmcli connection add`, `connection modify`, `connection up/down/delete/show/load/monitor`, `device status/show/connect/disconnect/set`, terse output, field selection, `--wait`, VLAN, DNS, static IPv4, and journal examples were checked against the NetworkManager CLI documentation, RHEL 9 networking documentation, local manual pages, and local `nmcli --offline` validation where applicable. The examples are syntactically valid for current NetworkManager/nmcli behavior.
