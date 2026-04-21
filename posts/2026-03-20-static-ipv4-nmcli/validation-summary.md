# Validation Summary: How to Configure a Static IPv4 Address with nmcli - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Linux networking
- NetworkManager
- nmcli
- IPv4 static addressing
- DNS configuration
- iproute2 `ip`
- iputils `ping`
- systemd NetworkManager service management

## Sources Consulted
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- Red Hat Enterprise Linux 7 Networking Guide, "Configuring IP Networking with nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-Configuring_IP_Networking_with_nmcli
- Red Hat Enterprise Linux networking documentation examples for static IPv4 configuration with `nmcli`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/configuring_and_managing_networking/configuring-static-routes_configuring-and-managing-networking
- Local CLI help output from `nmcli` 1.46.0, `ip address`, `ip route`, and `ping`

## Issues Found
- The post told readers to replace `eth0` with the interface name in `nmcli connection` commands. NetworkManager `connection` commands identify profiles by connection name, UUID, or D-Bus path; the connection profile name may differ from the kernel interface name. I updated the affected `nmcli connection modify`, `down`, `up`, and `show` examples to use a quoted `connection-name` placeholder, and updated the `ip -4 addr show` example to use an `interface-name` placeholder.

## Review Notes
The `nmcli` IPv4 properties used in the post are current and valid: `ipv4.method manual`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, and `ipv4.dns-search`. The comma-separated address, DNS, and DNS search-domain examples were verified with `nmcli --offline` on `nmcli` 1.46.0. The guide could mention in a future update that administrative privileges or PolicyKit authorization may be required depending on the distribution and session context.
