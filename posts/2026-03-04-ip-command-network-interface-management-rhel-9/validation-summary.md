# Validation Summary: How to Use the ip Command for Network Interface Management on RHEL

## Status
validated

## Post Type
Technical guide / command-line tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux iproute2 `ip` command
- Network interfaces and addresses
- Routing tables and policy routing
- ARP/NDP neighbor tables
- VLAN and bridge interfaces
- NetworkManager / `nmcli`

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Customer Portal ip command cheat sheet: https://access.redhat.com/articles/ip-command-cheat-sheet
- Linux `ip(8)` manual page: https://www.man7.org/linux/man-pages/man8/ip.8.html
- Linux `ip-address(8)` manual page: https://www.man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ip-route(8)` manual page: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip-neighbour(8)` manual page: https://linuxman7.com/linux/man-pages/man8/ip-neighbour.8.html
- Local `iproute2` help output from `ip -help`, `ip link help`, `ip addr help`, `ip route help`, `ip neigh help`, `ip rule help`, and `ip monitor help`

## Issues Found
- The static ARP entry example omitted the neighbor state. Changed it to include `nud permanent`, because `ip-neighbour(8)` defines `permanent` as a neighbor entry that remains valid until administratively removed.
- The duplicate IPv6 address troubleshooting example searched for `tentative`. Changed it to search for `dadfailed`, because `tentative` means Duplicate Address Detection is still in progress, while `dadfailed` indicates DAD failure.
- The quick-reference `ifconfig` address example did not include a netmask, while the replacement command used `/24`. Updated the legacy command to include `netmask 255.255.255.0` so the two commands describe equivalent address configuration.

## Review Notes
The remaining commands and claims are consistent with RHEL 9 networking guidance and current `iproute2` syntax. The examples remain runtime configuration examples; persistent RHEL network configuration should continue to use NetworkManager tools such as `nmcli`.
