# Validation Summary: How to Configure Balance-TLB Bonding (Mode 5) on Linux

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Linux kernel bonding driver
- `iproute2` (`ip link`, `ip route`)
- NetworkManager / `nmcli`
- Netplan
- Linux networking

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- NetworkManager `nmcli` examples: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager wait-online behavior notes: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-wait-online.service.html
- Netplan YAML reference: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Local CLI help: `ip link help bond`
- Local CLI help: `nmcli connection add help`

## Issues Found
- The post said mode 5 requires the `ethtool` utility. I changed this to require NIC drivers with `ethtool` support for slave speed reporting, which is what the kernel bonding documentation requires.
- The runtime route example omitted `dev bond0`. I made the route command explicit so it attaches the default route to the bonded interface shown in the example.
- The Netplan snippet was not a standalone valid bond configuration and did not persist the default route. I added the `network:` structure, declared the member Ethernet interfaces, and included the default route.
- The `nmcli` snippet only created the bond controller and did not create bond port profiles, ensure the ports auto-activate with the bond, assign the static IPv4 configuration, or activate the bond. I expanded it to a working example using current NetworkManager syntax and the current `connection.autoconnect-ports` setting.
- The monitoring comment above `/proc/net/bonding/bond0` implied that file shows per-slave traffic distribution. I corrected it to describe bond state and active-slave information, while leaving `ip -s link` as the per-interface statistics command.
- The conclusion overstated mode 6 as full bidirectional load balancing in general. I narrowed it to adaptive receive balancing for IPv4 traffic to match the upstream kernel documentation.

## Review Notes
- The transient `ip` commands are valid with current bonding netlink syntax.
- The `primary` option is valid for `balance-tlb` mode and selects the preferred active slave.
- The `nmcli` example uses `connection.autoconnect-ports`, which is the current property name replacing the older `connection.autoconnect-slaves` alias.
- No other technical issues were found after these corrections.
