# Validation Summary: How to Configure MTU and Jumbo Frames on RHEL 9 for High-Performance Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux networking
- MTU and jumbo frames
- NetworkManager / nmcli
- iproute2 ip command
- iputils ping
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Tuning the network performance, jumbo frame considerations and MTU configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- NetworkManager nm-settings-nmcli reference for `802-3-ethernet.mtu`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- ethtool manual for `--driver` / `-i` behavior: https://man.he.net/man8/ethtool
- Local `ip link help` output for `ip link show` and `ip link set ... mtu`
- Local `ping -h` output for `-M <pmtud opt>` and `-s <size>`
- Local `nmcli con mod help` output for connection modification syntax

## Issues Found
- The "Verify Jumbo Frame Support" section used `ethtool -i eth0`, but `ethtool -i` queries driver information and does not verify jumbo-frame or MTU support. Changed the command to `ip -d link show eth0`, which can show interface details including driver-reported `minmtu` and `maxmtu` values when available.

## Review Notes
The remaining commands are technically valid. The NetworkManager profile name `"System eth0"` is environment-specific; users may need to replace it with the actual profile name from `nmcli connection show`. The IPv4 ping payload calculation of `9000 - 28 = 8972` is correct for IPv4 ICMP echo tests.
