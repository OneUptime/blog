# Validation Summary: How to Delete a Static Route on Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Linux `iproute2` suite (`ip route` command)
- Legacy `net-tools` (`route` command)
- Netplan (Ubuntu/Debian)
- ifcfg / network-scripts (RHEL/CentOS 7)
- NetworkManager / `nmcli` (RHEL 8+)
- systemd-networkd
- Bash scripting

## Sources Consulted
- `ip-route(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-route.8.html
- `route(8)` man page (net-tools): https://man7.org/linux/man-pages/man8/route.8.html
- `nmcli(1)` man page: https://networkmanager.dev/docs/api/latest/nmcli.html
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- systemd.network man page: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- Red Hat Enterprise Linux 7 Networking Guide (route-interface configuration): https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/

## Issues Found
No technical issues found.

All commands verified:
- `ip route del` syntax variants (`via`, `dev`, `default`) match `ip-route(8)`.
- `ip route flush dev <iface>` and `ip route flush table main` are valid iproute2 commands.
- The error string "RTNETLINK answers: No such process" is the actual kernel response when deleting a non-existent route.
- `nmcli connection modify <conn> -ipv4.routes "<dest> <gw>"` correctly uses the `-` prefix syntax to remove an item from a list property; the route value format ("network/prefix gateway") matches nmcli's expected format.
- Legacy `route del -net ... netmask ... gw ...` syntax is correct per `route(8)`.
- The ifcfg config path `/etc/sysconfig/network-scripts/route-eth0` and `systemctl restart network` are correct for RHEL/CentOS 7.
- `systemctl restart systemd-networkd` and the `/etc/systemd/network/*.network` file format are correct.
- The bash array iteration script is syntactically valid.

## Review Notes
- On RHEL/CentOS 7, the `network` service (initscripts) was deprecated in favor of NetworkManager in RHEL 8+. The post correctly scopes the `systemctl restart network` instruction to RHEL/CentOS 7.
- For NetworkManager, the connection identifier passed to `nmcli connection modify` is technically the connection name (or UUID), not the device name. In many setups the connection name happens to equal the device name (e.g., "eth0"), but readers with custom connection names like "Wired connection 1" should adjust accordingly. This is a common simplification in tutorials and is not strictly incorrect.
- `ip route flush table main` is appropriately flagged as dangerous in the post.
- The legacy `route` command (net-tools) is deprecated on most modern distributions in favor of `ip route`; the post correctly labels this section as "Legacy".
