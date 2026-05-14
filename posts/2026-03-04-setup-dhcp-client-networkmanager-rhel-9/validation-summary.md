# Validation Summary: How to Set Up DHCP Client Configuration Using NetworkManager on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- DHCPv4 and DHCPv6
- NetworkManager dispatcher scripts
- Linux networking troubleshooting tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring NetworkManager DHCP settings": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-networkmanager-dhcp-settings_configuring-and-managing-networking
- Red Hat Enterprise Linux 9.5 release notes, deprecated functionality for dhcp-client: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/9.5_release_notes/Red_Hat_Enterprise_Linux-9-9.5_Release_Notes-en-US.pdf
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager NetworkManager.conf reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- NetworkManager dispatcher reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-dispatcher.html
- NetworkManager mailing list guidance on internal DHCP lease files: https://lists.gnome.org/archives/networkmanager-list/2022-June/msg00009.html
- Local nmcli validation with NetworkManager 1.46.0 using `nmcli --offline connection add`

## Issues Found
- The post claimed that NetworkManager supports `ipv4.dhcp-request-options` for arbitrary DHCP option request lists. This is not a valid RHEL 9 / NetworkManager profile property, and local `nmcli --offline` validation rejected it. I replaced the example with the supported `ipv4.dhcp-vendor-class-identifier` property and clarified that arbitrary request-list configuration is not exposed as that profile property.
- The DHCP timeout section said `0 = infinite`. NetworkManager documents `0` as the default value and `infinity` / `2147483647` as the infinite timeout. I corrected the comment and noted the documented 45-second default.
- The DHCP client section did not mention that `dhclient` is deprecated in RHEL 9.5 and later. I added that caveat while keeping the RHEL 9 configuration example because Red Hat still documents it for RHEL 9.
- The IPv6 section described `ipv6.method auto` as simply enabling DHCPv6. NetworkManager documents `auto` as IPv6 autoconfiguration with DHCPv6 used when router advertisements request it. I clarified that and added the `ipv6.method dhcp` option for stateful DHCPv6-only addressing.
- The lease viewing section encouraged parsing `/var/lib/NetworkManager/internal-*` lease files. NetworkManager maintainers describe those files as private data and recommend `nmcli -f DHCP4` or `nmcli -f ALL device show`. I changed the example to use `nmcli`.
- The static fallback dispatcher script would run on normal `down` events and add an unmanaged address outside NetworkManager, which is not a reliable DHCP-failure fallback. I replaced it with RHEL 9-supported NetworkManager settings for link-local addressing alongside DHCP and noted that RHEL 9 has no profile setting for "static address only if DHCP fails."

## Review Notes
The remaining commands and properties were checked against the NetworkManager settings reference and local `nmcli --offline` parsing where practical. Interface names, DNS addresses, and hostnames remain examples that users must adapt to their environment.
