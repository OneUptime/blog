# Validation Summary: How to Configure DHCP with Netplan

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Netplan
- Linux networking
- DHCPv4
- IPv4 addressing
- `systemd-networkd`
- NetworkManager

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan CLI reference: https://netplan.readthedocs.io/en/stable/cli/
- `netplan ip` reference: https://netplan.readthedocs.io/en/stable/netplan-ip/
- `netplan status` reference: https://netplan.readthedocs.io/en/stable/netplan-status/
- `networkctl` manual: https://www.freedesktop.org/software/systemd/man/254/networkctl.html

## Issues Found
- The post used `use-mac: true` inside `dhcp4-overrides`, but `use-mac` is not a valid Netplan DHCP override key. I replaced it with `dhcp-identifier: mac`, which is the documented way to use the MAC address as the DHCPv4 client identifier.
- The custom override example used keys such as `hostname` and `use-dns` without noting that they are `systemd-networkd`-specific in Netplan. I added a short note and set `renderer: networkd` in that example so it matches the documented behavior.
- The troubleshooting section used `networkctl` and direct lease-file inspection as generic DHCP verification steps. I updated it to use `netplan ip leases eth0` for lease inspection and clarified that `networkctl status eth0` is for systems using `systemd-networkd`.
- The `DHCP4-Overrides Reference` table incorrectly listed `use-mac` and omitted several actual documented keys. I corrected the table to reflect the current Netplan reference and adjusted the `route-metric` default to `backend default` instead of claiming a universal default of `100`.

## Review Notes
- The multiple-interface DHCP example is valid, but systems with more than one DHCP-enabled interface often need route metrics to avoid ambiguous default-route preference.
- Interface names like `eth0` are examples only; many modern Ubuntu and Debian systems use predictable names such as `enp0s3` or `ens3`.
