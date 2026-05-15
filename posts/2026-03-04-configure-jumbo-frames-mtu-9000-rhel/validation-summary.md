# Validation Summary: How to Configure Jumbo Frames and MTU 9000 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux networking
- NetworkManager and nmcli
- Jumbo frames and MTU configuration
- Linux iproute2 `ip link`
- Linux iputils `ping`
- Network bonding and VLAN interfaces
- iperf3 throughput testing

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Improving the throughput of large amounts of contiguous data streams, including jumbo frame considerations and MTU configuration with NetworkManager: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/network_troubleshooting_and_performance_tuning/improving-the-throughput-of-large-amounts-of-contiguous-data-streams
- NetworkManager nm-settings-nmcli reference for `802-3-ethernet.mtu` and the `mtu` alias: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Linux `ping(8)` manual for `-M` path MTU discovery mode, `-s` packet size, and `-c` count options: https://man7.org/linux/man-pages/man8/ping.8.html
- Red Hat Enterprise Linux 10 documentation: Testing TCP throughput by using iperf3: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/network_troubleshooting_and_performance_tuning/tuning-tcp-connections-for-high-throughput
- Local command help for installed `nmcli` 1.46.0, `ip link`, and `ping`.

## Issues Found
- The original `nmcli connection modify ens192 802-3-ethernet.mtu 9000` examples were technically valid for Ethernet profiles, but the surrounding wording implied that `ens192` was always the interface name. Red Hat documents this operation as modifying the NetworkManager connection profile that manages the interface. I updated the comments to refer to the connection profile and used the documented `mtu` alias.
- The bond and VLAN examples used the long Ethernet property name throughout. I changed these to the documented `mtu` alias so the examples match Red Hat's current guidance for setting MTU on NetworkManager connection profiles.
- The ping troubleshooting note said that `"Message too long"` means a device in the path does not support jumbo frames. That error can also occur when the local outgoing interface MTU is too small. I updated the note to include the local interface.

## Review Notes
- The `ping -M do -s 8972` example is correct for IPv4 MTU 9000 because the payload size excludes the 20-byte IPv4 header and 8-byte ICMP header.
- Red Hat notes that all devices in the relevant broadcast domain or transmission path must support the configured MTU, and that jumbo frames are best limited to specific backend or storage networks.
- `iperf3` examples are valid, but real performance comparisons can vary with socket buffers, CPU, NIC offloads, and current network traffic.
