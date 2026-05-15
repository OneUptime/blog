# Validation Summary: How to Configure Static IP Addresses on RHEL Using nmcli

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- IPv4 and IPv6 static addressing
- NetworkManager keyfile connection profiles
- Linux networking verification commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing networking, static IPv4 example with `nmcli connection modify` - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 documentation: Managing the default gateway setting - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/managing-the-default-gateway-setting_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: NetworkManager connection profiles in keyfile format - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- NetworkManager Reference Manual: `nm-settings-nmcli` properties for `ipv4.method`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `ipv4.dns-search`, and IPv6 equivalents - https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager Reference Manual: `nm-settings-keyfile` keyfile format and storage behavior - https://networkmanager.dev/docs/api/latest/nm-settings-keyfile.html
- Local `nmcli` 1.46.0 help output for `connection add` and `connection modify` syntax.

## Issues Found
- The keyfile section said NetworkManager stores connection profiles in `/etc/NetworkManager/system-connections/` without qualification. Updated it to specify RHEL 9, persistent profiles, and the default behavior, matching Red Hat documentation.
- The keyfile inspection example assumed the filename is always `/etc/NetworkManager/system-connections/ens192.nmconnection`. Added `nmcli -f NAME,FILENAME connection show ens192` first so readers can confirm the actual filename before using the example `cat` command.
- The wrap-up recommended version-controlling keyfile configurations without mentioning that keyfiles can contain sensitive values and must remain root-only. Reworded it to focus on reviewability and added a root-only sensitivity caveat.

## Review Notes
The nmcli commands and property names in the post are current and consistent with Red Hat Enterprise Linux 9 and NetworkManager documentation. The command examples use documentation-supported settings such as `ipv4.method manual`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `ipv4.dns-search`, and the equivalent IPv6 properties. The `nslookup` verification command may require the relevant DNS utilities package on minimal installations, but the command itself is valid.
