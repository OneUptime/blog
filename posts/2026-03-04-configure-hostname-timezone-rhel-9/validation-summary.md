# Validation Summary: How to Configure the System Hostname and Time Zone on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd hostname management with `hostnamectl`
- systemd time and RTC management with `timedatectl`
- NetworkManager hostname handling with `nmcli` and configuration drop-ins
- Linux `/etc/hostname`, `/etc/hosts`, `/etc/localtime`, and `/etc/machine-info`
- Linux hardware clock management with `hwclock`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Changing a hostname": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_changing-a-hostname_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Configuring the date and time": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_changing-basic-environment-settings_configuring-basic-system-settings
- systemd `hostnamectl(1)` manual: https://www.freedesktop.org/software/systemd/man/latest/hostnamectl.html
- systemd `timedatectl(1)` manual: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- systemd `localtime(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/localtime.html
- systemd `machine-info(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/machine-info.html
- NetworkManager configuration manual: https://networkmanager.dev/docs/api/latest/NetworkManager.conf.html
- NetworkManager hostname settings manual: https://networkmanager.dev/docs/api/latest/settings-hostname.html
- NetworkManager IPv4 settings manual: https://networkmanager.dev/docs/api/latest/settings-ipv4.html
- Local command help and man page output for `hostnamectl`, `timedatectl`, `nmcli`, `NetworkManager.conf`, and `nm-settings-nmcli`.

## Issues Found
- The post said the transient hostname defaults to the static hostname in the `hostnamectl set-hostname` flow. Red Hat's RHEL 9 documentation states that `hostnamectl set-hostname` sets the static and transient hostnames by default, so the explanation and Mermaid diagram were adjusted.
- The NetworkManager per-connection example used `ipv4.dhcp-send-hostname no` to prevent DHCP from overriding the hostname. That property controls whether the client sends its hostname to the DHCP server; it does not control accepting a hostname from DHCP. The command was changed to `hostname.from-dhcp no`, and the check command was updated accordingly.

## Review Notes
The `/etc/hosts` example uses `127.0.1.1`, which is common on some Linux distributions but not the only RHEL-style approach. The post already notes that using the server's actual IP address can be more reliable, so no correction was required.
