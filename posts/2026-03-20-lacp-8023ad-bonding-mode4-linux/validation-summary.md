# Validation Summary: How to Configure LACP/802.3ad Bonding (Mode 4) on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel bonding driver
- `iproute2` / `ip link`
- LACP / IEEE 802.3ad bonding
- Netplan
- NetworkManager / `nmcli`

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/networking/bonding.html
- Netplan YAML reference for bonds: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- Local CLI help: `ip link help bond`
- Local CLI help: `nmcli connection add help`
- Local syntax validation: `nmcli --offline connection add ...`

## Issues Found
- The post recommended `layer3+4` as the best transmit hash policy. The Linux kernel bonding documentation states that `layer3+4` is not fully 802.3ad compliant, so I updated the hash-policy guidance and conclusion to describe the compliance tradeoff accurately.
- The `nmcli` example created the bond profile but did not persist the static IPv4 address and default gateway used elsewhere in the post. I added `ip4 192.168.1.100/24` and `gw4 192.168.1.1` so the example matches the documented target configuration.
- The `nmcli` port examples used the deprecated `master` alias. I updated them to the current `controller ... port-type bond` form documented by NetworkManager.
- The `nmcli` example relied on `nmcli connection up bond-lacp` without configuring the controller to auto-activate its ports. I added `connection.autoconnect-ports 1` so the activation command matches current NetworkManager behavior.
- The `lacp_rate` comment in the `ip link` example implied a direct transmit interval. I reworded it to match the kernel documentation more closely: it requests the partner's LACPDU rate.

## Review Notes
- The Netplan example is valid for systems using the `networkd` renderer; hosts using NetworkManager as the Netplan renderer would need a different backend path.
- As with all 802.3ad deployments, effective bandwidth scaling applies across multiple flows or peers; a single flow will normally stay on one selected member link.
