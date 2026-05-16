# Validation Summary: How to Set Up Network Bonding in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos machine configuration
- Talos network configuration resources
- Linux network bonding
- LACP / IEEE 802.3ad
- VLANs
- DHCP
- talosctl

## Sources Consulted
- Talos Linux BondConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/bondconfig
- Talos Linux bond logical link guide: https://docs.siderolabs.com/talos/v1.12/networking/logical/bond
- Talos Linux DHCPv4Config reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/dhcpv4config
- Talos Linux ResolverConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/resolverconfig
- Talos Linux VLANConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/vlanconfig
- Talos Linux LinkAliasConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/linkaliasconfig
- Talos Linux configuration patching guide: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/system-configuration/patching
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Linux Ethernet Bonding Driver HOWTO: https://docs.kernel.org/networking/bonding.html

## Issues Found
- The post used the older `machine.network.interfaces` bond snippets. Current Talos documentation uses multi-document network configuration resources such as `BondConfig`, so the examples were updated to that format.
- Static address and route fields used the older shape (`addresses` as strings and `routes[].network`). Updated them to `addresses[].address` and `routes[].destination` as documented for `BondConfig` and `VLANConfig`.
- DNS configuration used `machine.network.nameservers`. Updated it to a `ResolverConfig` document with `nameservers[].address`.
- The DHCP example used `dhcp: true` on the interface. Updated it to a `DHCPv4Config` document targeting `bond0`.
- The device selector example used bond `deviceSelectors`, which is not part of the current `BondConfig` resource. Updated it to create `LinkAliasConfig` documents selected by MAC address and use those aliases as bond links.
- The VLAN example used nested `vlans` under the bond. Updated it to separate `VLANConfig` documents with `parent: bond0`.
- The advanced example included `primary`, which is not present in current `BondConfig`. Replaced it with the documented `failOverMac` option and adjusted the failover testing note that referenced `primary_reselect`.

## Review Notes
The Talos CLI patch commands remain valid: official patching documentation states that strategic merge patches can append multi-document configuration documents when the target document does not already exist. Network changes on running nodes should still be applied cautiously, preferably with out-of-band access or a rollback-capable mode.
