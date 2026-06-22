# Validation Summary: How to Configure Network Interfaces in Linux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Linux networking
- iproute2 `ip` and `ss` commands
- Netplan YAML configuration
- NetworkManager and `nmcli`
- systemd-networkd and systemd-resolved
- Ethernet bonding
- VLANs
- Network bridges
- Network troubleshooting tools

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/latest/examples/
- Netplan `generate` and `try` manual pages (`netplan-generate(8)`, `netplan-try(8)`)
- systemd-networkd manual page (`systemd.network(5)`): https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd netdev manual page (`systemd.netdev(5)`): https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- NetworkManager `nmcli` reference: https://networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local command/man-page checks for `ip`, `ss`, `resolvectl`, `networkctl`, `journalctl`, `nmcli`, `systemd.network(5)`, and `systemd.netdev(5)`

## Issues Found
- Netplan bonding parameter was spelled `mii-monitoring-interval`. Netplan documents the valid key as `mii-monitor-interval`, so the YAML example was corrected.
- The systemd-networkd bonding example set `PrimaryReselectPolicy=always` but did not mark any slave as the primary slave. The example was split into separate slave match files and `PrimarySlave=true` was added for `eth0`, matching `systemd.network(5)` behavior.

## Review Notes
The remaining commands and configuration snippets are broadly correct for modern Linux distributions using iproute2, Netplan, NetworkManager, and systemd-networkd. Some examples assume common tools such as `dig`, `nslookup`, `traceroute`, `mtr`, `tcpdump`, `dhclient`, and `arping` are installed separately, which is normal for troubleshooting guides but may vary by distribution.
