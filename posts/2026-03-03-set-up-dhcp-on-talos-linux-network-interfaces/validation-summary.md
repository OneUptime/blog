# Validation Summary: How to Set Up DHCP on Talos Linux Network Interfaces

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Talos Linux network configuration
- DHCPv4 and DHCPv6
- VLAN interfaces
- Static addressing and default routes
- `talosctl` CLI
- Kubernetes control plane endpoint configuration

## Sources Consulted
- Talos Linux v1.13 Dynamic Network Configuration documentation: https://docs.siderolabs.com/talos/v1.13/networking/configuration/dynamic
- Talos Linux v1.13 Static Network Configuration documentation: https://docs.siderolabs.com/talos/v1.13/networking/configuration/static
- Talos Linux v1.13 Configuration Reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration
- Talos Linux v1.13 CLI Reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.6 Configuration Reference, used to identify the older `machine.network.interfaces[].dhcp` format originally shown in the post: https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config

## Issues Found
- The post used the older Talos `machine.network.interfaces[].dhcp` and `dhcpOptions` configuration style. Current Talos documentation uses network configuration documents such as `DHCPv4Config`, `DHCPv6Config`, `ResolverConfig`, `HostnameConfig`, `LinkConfig`, and `VLANConfig`. Updated all DHCP, dual-stack, DNS override, VLAN, and static migration snippets to use the current document-based format.
- The dual-stack example used `dhcpOptions.ipv4` and `dhcpOptions.ipv6`, which does not match current Talos network configuration. Replaced it with separate `DHCPv4Config` and `DHCPv6Config` documents for the same link.
- The VLAN example used the old nested interface VLAN syntax. Replaced it with a `VLANConfig` document using `name`, `parent`, and `vlanID`, plus a `DHCPv4Config` document for the VLAN link.
- The static migration patch example patched the old `machine.network.interfaces` structure. Replaced it with a documented live machine configuration patch that deletes the `DHCPv4Config` document and adds a `LinkConfig` document with a static address and gateway route.
- The worker and cloud examples referenced `ghcr.io/siderolabs/installer:v1.6.0`, which is outdated for a current Talos guide. Updated these examples to `ghcr.io/siderolabs/installer:v1.13.0` and added the required `version: v1alpha1` field to the machine configuration document examples.

## Review Notes
The `talosctl get addresses`, `talosctl get routes`, `talosctl get links`, `talosctl logs networkd`, and `talosctl patch machineconfig --patch` command forms are consistent with the Talos CLI reference. The article still uses `eth0` as an example interface name, which is acceptable as a placeholder, but real deployments should confirm the link name with `talosctl get links`.
