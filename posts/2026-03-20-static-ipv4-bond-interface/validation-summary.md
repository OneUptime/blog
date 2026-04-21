# Validation Summary: How to Assign a Static IPv4 Address to a Bond Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking
- Network bonding
- IPv4 static addressing
- iproute2
- Netplan
- NetworkManager / nmcli
- systemd-networkd
- iputils ping

## Sources Consulted
- Local iproute2 6.1.0 command help and installed `ip-address(8)` / `ip-route(8)` man pages.
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan bonding examples: https://netplan.readthedocs.io/en/latest/examples/
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager IPv4 setting reference: https://www.networkmanager.dev/docs/api/latest/settings-ipv4.html
- systemd.network reference manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- Linux kernel bonding driver documentation: https://docs.kernel.org/networking/bonding.html
- Local iputils `ping -h` output for `-I` and `-c` option syntax.

## Issues Found
- The introduction listed persistent methods as only Netplan and nmcli, but the post also includes systemd-networkd. Updated the sentence to list Netplan, nmcli, and systemd-networkd.
- The conclusion said to always configure both the IP address and default gateway. This is too broad because bonds on isolated, storage, backup, or secondary networks may not provide the host's default route. Updated it to say to configure the default gateway when the bond should provide the host's default route.

## Review Notes
- The `ip addr`, `ip route`, `ping`, Netplan, nmcli, and systemd-networkd examples use valid syntax for the documented tools.
- The Netplan bond YAML structure was also checked with local `netplan generate`; no schema error was reported.
- The nmcli example assumes the NetworkManager connection profile is named `bond0`. On systems where the profile ID differs from the interface name, users should substitute the actual connection profile name.
